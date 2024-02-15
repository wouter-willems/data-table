import {
	Component, ContentChild,
	ContentChildren,
	Directive, ElementRef,
	EventEmitter,
	inject,
	InjectionToken, Injector,
	Input,
	OnChanges,
	OnInit,
	Output,
	QueryList,
	SimpleChanges,
	TemplateRef, ViewChild
} from '@angular/core';
import {arrayIsSetAndFilled, removeDuplicatesFromArray} from '../util/arrays';
import {isValueSet, stringIsSetAndFilled, useIfStringIsSet} from '../util/values';
import {awaitableForNextCycle} from "../util/angular";
import {isEqual, debounce} from 'lodash';
import {filterUnsetValues} from "../util/objects";

export const CheckBoxRefToken = new InjectionToken('checkbox');
export const ConfigBtnRefToken = new InjectionToken('config btn');
export const ActionMenuBtnRefToken = new InjectionToken('actionMenu');
export const SearchInputRefToken = new InjectionToken('searchInput');

// tslint:disable-next-line:directive-selector
@Directive({selector: '[columnKey]'})
export class ColumnKeyDirective {
	@Input() columnKey;
	@Input() columnCaption;
	@Input() sortKey;
	@Input() defaultSort: 'ASC' | 'DESC';
	@Input() fixedWidthOnContents: boolean;
	@Input() fixedWidthInREM: number;
	@Input() widthAsRatio: number = 1;
}

@Component({
	selector: 'wutu-data-table',
	templateUrl: './data-table.component.html',
	styleUrls: ['./data-table.component.scss'],
})
export class DataTableComponent implements OnChanges, OnInit {
	@ViewChild('selectBoxDummy') selectBoxDummy: ElementRef;
	@ViewChild('actionMenuDummy') actionMenuDummy: ElementRef;
	@ViewChild('configBtnDummy') configBtnDummy: ElementRef;

	@ContentChildren(ColumnKeyDirective, {read: TemplateRef}) templates: QueryList<TemplateRef<any>>;
	@ContentChildren(ColumnKeyDirective, {read: ColumnKeyDirective}) columnKeyDirectives: QueryList<ColumnKeyDirective>;

	@Input() horizontalScroll = false;
	@Input() searchParams;
	@Input() fetchItemsFn: (start: number, searchQuery: string, itemsPerPage: number, sortField: string, sortOrder: 'ASC' | 'DESC') => Promise<{
		totalAmount: number,
		data: Array<Record<string, any>>
	}>;
	@Input() getActionsForRowFn: (r: any) => Array<{
		caption: string,
		action: () => void,
	}>;
	@Input() getActionsForMultipleRowsFn: (r: Array<any>) => Array<{
		caption: string,
		action: () => void,
	}>;
	@Input() retrieveColumnsFn: () => Promise<Array<{
		key: string,
		active: boolean,
	}>>;
	@Input() persistColumnsFn: (r: Array<{
		key: string,
		active: boolean,
	}>) => Promise<void>;
	@Input() emptyTpl: TemplateRef<any>;
	@Output() onRowClicked = new EventEmitter<any>();
	@Output() onParamsChanged = new EventEmitter<any>();

	public columnWidthsToBeCalculated = true;

	public page = 1;
	public itemsPerPage = 25;
	public searchQuery: string = '';
	public sortField: string;
	public sortOrder: 'ASC' | 'DESC';
	public headerKeys: Array<string> = [];
	public headerCaptionByKey: Map<string, string> = new Map();
	public pageData: { totalAmount: number; data: Array<Record<string, any>> };
	public actions: Array<{
		caption: string,
		action: () => void,
	}>;
	public actionMenuForRow: any;
	public multipleRowsActionsShown: boolean = false;
	public definedColumns: Array<{ key: string, active: boolean }>;
	public showConfig: boolean = false;
	private backdropDiv: HTMLDivElement;
	public selectedState: Map<Record<string, any>, boolean> = new Map();

	public checkboxRef: TemplateRef<any>;
	public configBtnRef: TemplateRef<any>;
	public actionMenuBtnRef: TemplateRef<any>;
	public searchInputRef: TemplateRef<any>;
	public actionMenuOffset: { x: number, y: number };
	public loading = true;
	private initiated = false;

	constructor(private injector: Injector, private elRef: ElementRef) {
	}

	async ngOnInit(): Promise<void> {
		await awaitableForNextCycle();
		this.checkboxRef = this.injector.get<TemplateRef<any>>(CheckBoxRefToken);
		this.configBtnRef = this.injector.get<TemplateRef<any>>(ConfigBtnRefToken);
		this.actionMenuBtnRef = this.injector.get<TemplateRef<any>>(ActionMenuBtnRefToken);
		this.searchInputRef = this.injector.get<TemplateRef<any>>(SearchInputRefToken);
		this.initiated = true;
		await this.getData();
		if (!this.horizontalScroll) {
			await this.calculateColumnWidths();
		}
	}


	ngOnChanges(simpleChanges: SimpleChanges): void {
		if (isValueSet(simpleChanges.searchParams)) {
			const stateInternal = {
				page: Number(this.page),
				itemsPerPage: Number(this.itemsPerPage),
				searchQuery: this.searchQuery,
				sortField: this.sortField,
				sortOrder: this.sortOrder,
			};
			const c = simpleChanges.searchParams.currentValue;
			const stateExternal = {
				page: Number(c.page ?? stateInternal.page),
				itemsPerPage: Number(c.itemsPerPage ?? stateInternal.itemsPerPage),
				searchQuery: c.searchQuery ?? stateInternal.searchQuery,
				sortField: c.sortField ?? stateInternal.sortField,
				sortOrder: c.sortOrder ?? stateInternal.sortOrder
			};
			if (!isEqual(stateInternal, stateExternal)) {
				this.page = stateExternal.page || stateInternal.page;
				this.itemsPerPage = stateExternal.itemsPerPage || stateInternal.itemsPerPage;
				this.searchQuery = stateExternal.searchQuery ?? stateInternal.searchQuery;
				this.sortField = stateExternal.sortField ?? stateInternal.sortField;
				this.sortOrder = stateExternal.sortOrder ?? stateInternal.sortOrder;
				if (this.initiated) {
					this.getData();
				}
			}
		}
	}

	private prevSearchParams = {};
	private async getData(): Promise<void> {
		this.loading = true;
		const resultsBefore = this.pageData?.totalAmount ?? 0;
		const defaultSortField = this.columnKeyDirectives.find(e => stringIsSetAndFilled(e.defaultSort));
		if (!stringIsSetAndFilled(this.sortField)) {
			this.sortField = defaultSortField?.columnKey;
			this.sortOrder = defaultSortField?.defaultSort;
		}
		const params = this.getParams();
		if (!isEqual(params, this.prevSearchParams)) {
			const allParams = {
				page: this.page,
				itemsPerPage: Number(this.itemsPerPage) ?? 1,
				searchQuery: useIfStringIsSet(this.searchQuery),
				sortField: this.sortField,
				sortOrder: this.sortOrder,
			};
			this.onParamsChanged.emit(allParams);
		}
		this.prevSearchParams = {...params};

		const targetedColumn = this.columnKeyDirectives.find(e => e.columnKey === this.sortField);
		const sortFieldToUse = targetedColumn?.sortKey ?? this.sortField;
		this.pageData = await this.fetchItemsFn(
			params.start,
			params.searchQuery,
			params.itemsPerPage,
			sortFieldToUse,
			params.sortOrder
		);
		this.pageData.data.forEach(e => this.selectedState.set(e, false));
		await this.extractHeaders();
		if (resultsBefore === 0) {
			await this.calculateColumnWidths();
		}
		this.loading = false;
	}

	private getParams(): { itemsPerPage: number; searchQuery: string; sortOrder: 'ASC' | 'DESC'; start: number; sortField: string } {
		return {
			start: (this.page - 1) * (Number(this.itemsPerPage) ?? 1),
			searchQuery: this.searchQuery,
			itemsPerPage: (Number(this.itemsPerPage) ?? 1),
			sortField: this.sortField,
			sortOrder: this.sortOrder,
		};
	}

	private async extractHeaders(): Promise<void> {
		const keys = removeDuplicatesFromArray(Object.values(this.pageData.data).map(e => {
			return Object.keys(e);
		}).reduce((acc, cur) => {
			return [...acc, ...cur];
		}, []));
		if (!arrayIsSetAndFilled(this.definedColumns)) {
			this.definedColumns = (await this.retrieveColumnsFn?.()) ?? [];
			if (!arrayIsSetAndFilled(this.definedColumns)) {
				this.definedColumns = this.columnKeyDirectives.map(e => e.columnKey).map(e => ({key: e, active: true}));
			}
		}
		this.headerKeys = keys
		.filter(key => this.columnKeyDirectives.some(e => e.columnKey === key))
		.filter(key => this.definedColumns.some(e => e.key === key && e.active !== false))
		.sort((a, b) => {
			return this.definedColumns.findIndex(e => e.key === a) > this.definedColumns.findIndex(e => e.key === b) ? 1 : -1;
		});
		this.headerKeys.forEach(key => {
			this.headerCaptionByKey.set(key, this.columnKeyDirectives.find(e => e.columnKey === key)?.columnCaption);
		});
		await awaitableForNextCycle();
	}

	private async calculateColumnWidths(): Promise<void> {
		this.columnWidthsToBeCalculated = true;
		await awaitableForNextCycle();
		const selectBoxWidth = Math.ceil(this.selectBoxDummy.nativeElement.getBoundingClientRect().width);
		const lastColWidth = Math.ceil(Math.max(this.actionMenuDummy.nativeElement.getBoundingClientRect().width, this.configBtnDummy.nativeElement.getBoundingClientRect().width));
		const selectBoxContainerRef = this.elRef.nativeElement.querySelector('thead td.selectBoxContainer');
		const configBtnContainerRef = this.elRef.nativeElement.querySelector('thead td.configButtonContainer');
		if (selectBoxContainerRef) {
			selectBoxContainerRef.style.width = `${selectBoxWidth}px`;
		}
		if (configBtnContainerRef) {
			configBtnContainerRef.style.width = `${lastColWidth}px`;
		}
		const dynamicCols = [...this.elRef.nativeElement.querySelectorAll('thead td:not(.selectBoxContainer):not(.configButtonContainer)')];
		const ratiosCumulative = this.columnKeyDirectives.filter(e => {
			if (!this.headerKeys.includes(e.columnKey)) {
				return false;
			}
			if (e.fixedWidthOnContents) {
				return false;
			}
			if (e.fixedWidthInREM) {
				return false;
			}
			return true;
		}).reduce((acc, cur) => cur.widthAsRatio + acc, 0);
		dynamicCols.forEach((e, i) => {
			const colDirective = this.columnKeyDirectives.find(col => col.columnKey === this.headerKeys[i]);
			if (colDirective.fixedWidthOnContents) {
				return e.style.width = `${Math.ceil(e.getBoundingClientRect().width)}px`;
			}
			if (Number.isFinite(colDirective.fixedWidthInREM)) {
				e.style.width = `${colDirective.fixedWidthInREM}rem`;
				e.style.boxSizing = 'content-box';
				return;
			}
			return e.style.width = `${colDirective.widthAsRatio / ratiosCumulative * 100}%`;
		});
		this.columnWidthsToBeCalculated = false;
	}

	public getTemplate(header: string, value: any): TemplateRef<any> {
		const index = this.columnKeyDirectives.toArray().findIndex(e => {
			return e.columnKey === header;
		});
		if (isValueSet(value)) {
			return this.templates.toArray()[index];
		}
		return null;
	}

	public rowClicked(row: any): void {
		this.onRowClicked.emit(row);
	}

	showActions(row: any, target: EventTarget): void {
		this.actionMenuOffset = {
			x: (target as HTMLElement).getBoundingClientRect().right - this.elRef.nativeElement.getBoundingClientRect().right,
			y: (target as HTMLElement).getBoundingClientRect().top - this.elRef.nativeElement.getBoundingClientRect().top,
		};
		const actions = this.getActionsForRowFn?.(row) ?? [];
		this.actionMenuForRow = row;
		this.actions = actions;
		this.createBackdrop(() => {
			this.actionMenuForRow = null;
			this.actions = null;
		}, false);
	}

	showActionsMultipleRows(rows: Array<any>, target: EventTarget): void {
		this.multipleRowsActionsShown = true;
		this.actionMenuOffset = {
			x: (target as HTMLElement).getBoundingClientRect().right - this.elRef.nativeElement.getBoundingClientRect().right,
			y: (target as HTMLElement).getBoundingClientRect().top - this.elRef.nativeElement.getBoundingClientRect().top,
		};
		const actions = this.getActionsForMultipleRowsFn(rows) ?? [];
		this.actions = actions;
		this.createBackdrop(() => {
			this.multipleRowsActionsShown = false;
			this.actions = null;
		}, false);
	}

	hasActionMenuOpen(): boolean {
		return isValueSet(this.actionMenuForRow);
	}

	getPageNumbers(): Array<number> {
		const totalPages = this.getLastPage();
		const allPageNumbers = [...Array(totalPages).keys()].map(i => i + 1);
		return allPageNumbers.filter(i => Math.abs(i - this.page) < 4);
	}

	public getLastPage(): number {
		return Math.ceil(this.pageData.totalAmount / (this.itemsPerPage ?? 1));
	}

	toPage(pageNr: number): void {
		this.page = pageNr;
		this.getData();
	}

	openConfig = (): void => {
		this.showConfig = true;
		this.createBackdrop(() => this.showConfig = false, true);
	}


	private createBackdrop(clickHandler: () => void, blackBackground: boolean): void {
		this.backdropDiv = document.createElement('div');
		if (blackBackground) {
			this.backdropDiv.style.background = 'black';
		}
		this.backdropDiv.style.opacity = '0.5';
		this.backdropDiv.style.position = 'fixed';
		this.backdropDiv.style.top = '0';
		this.backdropDiv.style.right = '0';
		this.backdropDiv.style.bottom = '0';
		this.backdropDiv.style.left = '0';
		this.backdropDiv.style.zIndex = 'var(--wdt-column-rearrange-backdrop-zIndex)';
		this.backdropDiv.addEventListener('click', () => {
			setTimeout(clickHandler);
			document.body.removeChild(this.backdropDiv);
		});
		document.body.appendChild(this.backdropDiv);
	}

	closeConfig(): void {
		this.showConfig = false;
		document.body.removeChild(this.backdropDiv);
	}

	rowSelectClicked(row: Record<string, any>): void {
		this.setRowSelect(row, !this.selectedState.get(row));
	}

	private setRowSelect(row: Record<string, any>, newState: boolean): void {
		this.selectedState.set(row, newState);
	}

	public getHeaderSelectState(): boolean | undefined {
		if ([...this.selectedState.values()].every(e => e === true)) {
			return true;
		} else if ([...this.selectedState.values()].every(e => e === false)) {
			return false;
		} else {
			return undefined;
		}
	}

	public isSelected(row: Record<string, any>): boolean {
		return this.selectedState.get(row);
	}

	public getSelectedRows(): Array<Record<string, any>> {
		return [...this.selectedState.entries()]
			.filter(e => e[1] === true)
			.map(e => e[0]);
	}

	headerSelectClicked(): void {
		if ([...this.selectedState.values()].every(e => e === true)) {
			this.pageData.data.forEach((row, i) => this.setRowSelect(row, false));
		} else if ([...this.selectedState.values()].every(e => e === false)) {
			this.pageData.data.forEach((row, i) => this.setRowSelect(row, true));
		} else {
			this.pageData.data.forEach((row, i) => this.setRowSelect(row, true));
		}
	}

	itemsPerPageChanged(): void {
		this.page = 1;
		this.getData();
	}

	getShowActionsFn(row: Record<string, any>): (target) => void {
		return (target) => this.showActions(row, target);
	}
	getShowActionsMultipleFn(rows: Array<Record<string, any>>): (target) => void {
		return (target) => this.showActionsMultipleRows(rows, target);
	}

	public searchQueryChanged = debounce((searchQuery: string) => {
		this.page = 1;
		this.searchQuery = searchQuery;
		this.getData();
	}, 300);

	setSortField(headerKey: string): void {
		if (!this.isSortable(headerKey)) {
			return;
		}
		if (this.sortField === headerKey && this.sortOrder === 'DESC') {
			this.sortOrder = null;
			this.sortField = null;
		} else if (this.sortField === headerKey && this.sortOrder === 'ASC') {
			this.sortOrder = 'DESC';
		} else {
			this.sortField = headerKey;
			this.sortOrder = 'ASC';
		}
		this.getData();
	}

	isSortable(headerKey: string): boolean {
		return this.columnKeyDirectives.find(e => e.columnKey === headerKey).sortKey !== null;
	}

	async onColumnsSaved(): Promise<void> {
		await this.persistColumnsFn?.(this.definedColumns);
		await this.extractHeaders();
		await this.calculateColumnWidths();
	}

	closeActionMenu(): void {
		this.actionMenuForRow = null;
		this.actions = null;
		this.multipleRowsActionsShown = false;
		document.body.removeChild(this.backdropDiv);
	}

	public hasAtLeastOneResult(): boolean {
		return this.pageData?.totalAmount > 0;
	}

	public _ext_refreshTable(): void {
		this.getData();
	}

}
