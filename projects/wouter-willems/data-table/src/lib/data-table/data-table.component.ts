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
import {isValueSet, stringIsSetAndFilled} from '../util/values';
import {awaitableForNextCycle} from "../util/angular";
import {isEqual} from 'lodash';

export const CheckBoxRefToken = new InjectionToken('checkbox');
export const ConfigBtnRefToken = new InjectionToken('config btn');
export const ActionMenuBtnRefToken = new InjectionToken('actionMenu');
export const SearchInputRefToken = new InjectionToken('searchInput');

// tslint:disable-next-line:directive-selector
@Directive({selector: '[columnKey]'})
export class ColumnKeyDirective {
	@Input() columnKey;
	@Input() columnCaption;
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
	@Input() retrieveColumnsFn: () => Promise<Array<{
		key: string,
		active: boolean,
	}>>;
	@Input() persistColumnsFn: (r: Array<{
		key: string,
		active: boolean,
	}>) => Promise<void>;
	@Input() public currentPage = 1;
	@Output() onRowClicked = new EventEmitter<any>();
	@Output() onParamsChanged = new EventEmitter<any>();

	public columnWidthsToBeCalculated = true;

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
	public definedColumns: Array<{ key: string, active: boolean }>;
	public showConfig: boolean = false;
	private backdropDiv: HTMLDivElement;
	public selectedState: Map<Record<string, any>, boolean> = new Map();

	public checkboxRef: TemplateRef<any>;
	public configBtnRef: TemplateRef<any>;
	public actionMenuBtnRef: TemplateRef<any>;
	public searchInputRef: TemplateRef<any>;
	public actionMenuOffset: { x: number, y: number };
	private initiated = false;

	constructor(private injector: Injector, private elRef: ElementRef) {}

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
		if (isValueSet(simpleChanges.currentPage)) {
			this.toPage(simpleChanges.currentPage.currentValue);
		}
		if (isValueSet(simpleChanges.searchParams)) {
			const stateInternal =  {
				page: this.currentPage,
				itemsPerPage: this.itemsPerPage,
				searchQuery: this.searchQuery,
				sortField: this.sortField,
				sortOrder: this.sortOrder,
			};
			const c = simpleChanges.searchParams.currentValue;
			const stateExternal = {
				page: c.currentPage ?? stateInternal.page,
				itemsPerPage: c.itemsPerPage ?? stateInternal.itemsPerPage,
				searchQuery: c.searchQuery ?? stateInternal.searchQuery,
				sortField: c.sortField ?? stateInternal.sortField,
				sortOrder: c.sortOrder ?? stateInternal.sortOrder
			};
			if (!isEqual(stateInternal, stateExternal)) {
				this.currentPage = c.currentPage ?? stateInternal.page;
				this.itemsPerPage = c.itemsPerPage ?? stateInternal.itemsPerPage;
				this.searchQuery = c.searchQuery ?? stateInternal.searchQuery;
				this.sortField = c.sortField ?? stateInternal.sortField;
				this.sortOrder = c.sortOrder ?? stateInternal.sortOrder;
				if (this.initiated) {
					this.getData();
				}
			}
		}
	}

	private prevSearchParams = {};
	private async getData(): Promise<void> {
		const defaultSortField = this.columnKeyDirectives.find(e => stringIsSetAndFilled(e.defaultSort));
		if (!stringIsSetAndFilled(this.sortField)) {
			this.sortField = defaultSortField?.columnKey;
			this.sortOrder = defaultSortField?.defaultSort;
		}
		const params = this.getParams();
		if (!isEqual(params, this.prevSearchParams)) {
			this.onParamsChanged.emit({
				page: this.currentPage,
				itemsPerPage: this.itemsPerPage,
				searchQuery: this.searchQuery,
				sortField: this.sortField,
				sortOrder: this.sortOrder,
			});
		}
		this.prevSearchParams = {...params};
		console.log(params);
		this.pageData = await this.fetchItemsFn(
			params.start,
			params.searchQuery,
			params.itemsPerPage,
			params.sortField,
			params.sortOrder
		);
		this.pageData.data.forEach(e => this.selectedState.set(e, false));
		await this.extractHeaders();
	}

	private getParams(): { itemsPerPage: number; searchQuery: string; sortOrder: 'ASC' | 'DESC'; start: number; sortField: string } {
		return {
			start: (this.currentPage - 1) * (this.itemsPerPage ?? 1),
			searchQuery: this.searchQuery,
			itemsPerPage: (this.itemsPerPage ?? 1),
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
		const lastColWidth =  Math.ceil(Math.max(this.actionMenuDummy.nativeElement.getBoundingClientRect().width, this.configBtnDummy.nativeElement.getBoundingClientRect().width));
		this.elRef.nativeElement.querySelector('thead td:first-child').style.width = `${selectBoxWidth}px`;
		this.elRef.nativeElement.querySelector('thead td:last-child').style.width = `${lastColWidth}px`;
		const dynamicCols = [...this.elRef.nativeElement.querySelectorAll('thead td:not(:first-child):not(:last-child)')];
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

	hasActionMenuOpen(): boolean {
		return isValueSet(this.actionMenuForRow);
	}

	getPageNumbers(): Array<number> {
		const totalPages = this.getLastPage();
		const allPageNumbers = [...Array(totalPages).keys()].map(i => i + 1);
		return allPageNumbers.filter(i => Math.abs(i - this.currentPage) < 4);
	}

	public getLastPage(): number {
		return Math.ceil(this.pageData.totalAmount / (this.itemsPerPage ?? 1));
	}

	toPage(pageNr: number): void {
		this.currentPage = pageNr;
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
		this.currentPage = 1;
		this.getData();
	}

	getShowActionsFn(row: Record<string, any>): (target) => void {
		return (target) => this.showActions(row, target);
	}

	searchQueryChanged = (searchQuery: string) => {
		this.searchQuery = searchQuery;
		this.getData();
	}

	setSortField(headerKey: string): void {
		if (this.sortField === headerKey && this.sortOrder === 'ASC') {
			this.sortOrder = 'DESC';
		} else {
			this.sortField = headerKey;
			this.sortOrder = 'ASC';
		}
		this.getData();
	}

	async onColumnsSaved(): Promise<void> {
		await this.persistColumnsFn?.(this.definedColumns);
		await this.extractHeaders();
		await this.calculateColumnWidths();
	}

	closeActionMenu(): void {
		this.actionMenuForRow = null;
		this.actions = null;
	}
}
