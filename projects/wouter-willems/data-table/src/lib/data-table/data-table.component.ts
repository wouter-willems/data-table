import {
	Component,
	ContentChild,
	ContentChildren,
	Directive,
	ElementRef,
	EventEmitter,
	InjectionToken,
	Injector,
	Input,
	OnChanges, OnDestroy,
	OnInit,
	Output,
	QueryList,
	SimpleChanges,
	TemplateRef,
	ViewChild
} from '@angular/core';
import {arrayIsSetAndFilled, removeDuplicatesFromArray, removeDuplicatesFromArraysWithComparator} from '../util/arrays';
import {isValueSet, stringIsSetAndFilled, useIfStringIsSet} from '../util/values';
import {awaitableForNextCycle} from "../util/angular";
import {debounce, isEqual} from 'lodash';
import {SaveBtnRefToken} from "../column-rearranger/column-rearranger.component";

export const TranslationsToken = new InjectionToken('translations');
export const CheckBoxRefToken = new InjectionToken('checkbox');
export const ConfigBtnRefToken = new InjectionToken('config btn');
export const ActionMenuBtnRefToken = new InjectionToken('actionMenu');
export const SearchInputRefToken = new InjectionToken('searchInput');
export const FilterBtnRefToken = new InjectionToken('filter btn');

// tslint:disable-next-line:directive-selector
@Directive({selector: '[columnKey]'})
export class ColumnKeyDirective {
	@Input() columnKey;
	@Input() columnCaption;
	@Input() sortKey;
	@Input() defaultSort: 'ASC' | 'DESC';
	@Input() fixedWidthOnContents: boolean;
	@Input() growRatio: number = 1;
	@Input() minWidthInREM: number = null;
	@Input() maxWidthInREM: number = null;
	@Input() enabledByDefault: boolean = true;
}

// tslint:disable-next-line:directive-selector
@Directive({selector: '[filterForm]'})
export class FilterFormDirective {
}

export type WDTRow = {id: any} & Record<string, any>;

@Component({
	selector: 'wutu-data-table',
	templateUrl: './data-table.component.html',
	styleUrls: ['./data-table.component.scss'],
})
export class DataTableComponent implements OnChanges, OnInit, OnDestroy {
	@ViewChild('selectBoxDummy') selectBoxDummy: ElementRef;
	@ViewChild('actionMenuDummy') actionMenuDummy: ElementRef;
	@ViewChild('configBtnDummy') configBtnDummy: ElementRef;
	@ViewChild('actionMenuContainer') actionMenuContainer: ElementRef;
	@ViewChild('tableContainer') tableContainer: ElementRef;

	@ContentChildren(ColumnKeyDirective, {read: TemplateRef}) templates: QueryList<TemplateRef<any>>;
	@ContentChildren(ColumnKeyDirective, {read: ColumnKeyDirective}) columnKeyDirectives: QueryList<ColumnKeyDirective>;
	@ContentChild(FilterFormDirective, {read: TemplateRef}) filterFormTpl: TemplateRef<any>;

	@Input() horizontalScroll = false;
	@Input() searchParams;
	@Input() showSearchField = true;
	@Input() showFiltersBtn = true;
	@Input() allowSelectingAcrossMultiplePages = true;
	@Input() fetchItemsFn: (start: number, searchQuery: string, itemsPerPage: number, sortField: string, sortOrder: 'ASC' | 'DESC', filters: Record<string, any>) => Promise<{
		totalAmount: number,
		data: Array<WDTRow>
	}>;
	@Input() fetchSingleItemFn: (id: any) => Promise<WDTRow>;
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
	@Input() getExpandedTplFn: () => {index: number, tpl: TemplateRef<any>};
	@Input() emptyTpl: TemplateRef<any>;
	@Output() onRowClicked = new EventEmitter<{row: any, index: number}>();
	@Output() onParamsChanged = new EventEmitter<any>();

	public columnWidthsToBeCalculated = true;

	private maxBatchSize = 999;
	public page = 1;
	public itemsPerPage = 25;
	public searchQuery: string = '';
	public sortField: string;
	public sortOrder: 'ASC' | 'DESC';
	public headerKeys: Array<string> = [];
	public headerCaptionByKey: Map<string, string> = new Map();
	public pageData: { totalAmount: number; data: Array<WDTRow> };
	public actions: Array<{
		caption: string,
		action: () => void,
	}>;
	public actionMenuForRow: any;
	public multipleRowsActionsShown: boolean = false;
	public definedColumns: Array<{ key: string, active: boolean }>;
	public showConfig: boolean = false;
	public showFilters: boolean = false;
	private backdropDiv: HTMLDivElement;
	public selectedState: Map<number, boolean> = new Map();
	public idByRow: Map<number, WDTRow> = new Map();

	public checkboxRef: TemplateRef<any>;
	public configBtnRef: TemplateRef<any>;
	public actionMenuBtnRef: TemplateRef<any>;
	public searchInputRef: TemplateRef<any>;
	public filterBtnRef: TemplateRef<any>;
	public saveBtnRef: TemplateRef<any>;
	public actionMenuOffset: { x: number, y: number };
	public loading = true;
	private initiated = false;
	private activeFilters: Record<string, any>;
	private translations: Record<string, string>;
	public selectAllAcrossPagesActive: boolean = false;
	public selectAllAcrossPagesLoading: boolean = false;
	private escapeKeyListener: (ev) => void;
	private resizeListener: (ev) => void;

	constructor(private injector: Injector, private elRef: ElementRef) {
	}

	async ngOnInit(): Promise<void> {
		await awaitableForNextCycle();
		this.translations = this.injector.get<Record<string, string>>(TranslationsToken);
		this.checkboxRef = this.injector.get<TemplateRef<any>>(CheckBoxRefToken);
		this.configBtnRef = this.injector.get<TemplateRef<any>>(ConfigBtnRefToken);
		this.actionMenuBtnRef = this.injector.get<TemplateRef<any>>(ActionMenuBtnRefToken);
		this.searchInputRef = this.injector.get<TemplateRef<any>>(SearchInputRefToken);
		this.filterBtnRef = this.injector.get<TemplateRef<any>>(FilterBtnRefToken);
		this.saveBtnRef = this.injector.get<TemplateRef<any>>(SaveBtnRefToken);
		this.initiated = true;
		await this.getData();
		await this.calculateColumnWidths();

		this.escapeKeyListener = (ev) => {
			if (ev.key === 'Escape' && this.showFilters) {
				this.closeFilters();
			}
		};
		window.document.addEventListener('keyup', this.escapeKeyListener);

		this.resizeListener = debounce(() => {
			this.calculateColumnWidths();
		}, 300);
		window.addEventListener('resize', this.resizeListener);
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

	public translate = (key: string, params?: Record<string, any>): string => {
		const translated = this.translations?.[key] ?? key;
		if (!isValueSet(params)) {
			return translated;
		} else {
			return Object.keys(params).reduce((acc, cur) => {
				return acc.replace(`%${cur}%`, params[cur]);
			}, translated);
		}
	}

	private prevSearchParams = {};
	private async getData(): Promise<void> {
		this.loading = true;
		if (!this.selectAllAcrossPagesActive) {
			this.selectedState = new Map();
		}
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
			params.sortOrder,
			this.activeFilters,
		);
		this.pageData.data.forEach(e => {
			this.idByRow.set(e.id, e);
		});
		await this.extractHeaders();
		if (resultsBefore === 0) {
			await this.calculateColumnWidths();
		}
		this.loading = false;
	}

	public async selectAllAcrossPages(): Promise<void> {
		this.selectAllAcrossPagesLoading = true;
		this.selectAllAcrossPagesActive = true;
		this.selectedState = new Map();
		const batchSize = this.maxBatchSize;
		let currentBatch = 0;
		let haveAllItemsBeenFetched = false;
		let allItems: Array<WDTRow> = [];
		while (!haveAllItemsBeenFetched) {
			const batch = await this.fetchItemsFn(
				batchSize * currentBatch,
				useIfStringIsSet(this.searchQuery),
				batchSize,
				null,
				null,
				this.activeFilters,
			);
			batch.data.forEach(e => {
				this.idByRow.set(e.id, e);
			});
			allItems = [...allItems, ...batch.data];
			currentBatch++;
			if (batch.data.length < batchSize) {
				haveAllItemsBeenFetched = true;
			}
		}
		const allUniques: Array<WDTRow> = removeDuplicatesFromArraysWithComparator((e1, e2) => e1.id === e2.id, allItems);
		allUniques.forEach(e => this.selectedState.set(e.id, true));
		this.selectAllAcrossPagesLoading = false;
		this.showActionsMultipleRows();
	}


	public stopSelectingAcrossPages(): void {
		this.selectAllAcrossPagesActive = false;
		this.selectedState = new Map();
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
		const keys = removeDuplicatesFromArray(this.columnKeyDirectives.map(e => e.columnKey));
		if (!arrayIsSetAndFilled(this.definedColumns)) {
			const retrievedColumns = (await this.retrieveColumnsFn?.()) ?? [];
			if (arrayIsSetAndFilled(retrievedColumns)) {
				this.definedColumns = this.columnKeyDirectives.map(e => {
					const persisted = retrievedColumns.find(col => col.key === e.columnKey);
					if (isValueSet(persisted)) {
						return {key: e.columnKey, active: persisted.active};
					}
					console.log(e);
					return ({key: e.columnKey, active: e.enabledByDefault});
				}).sort((a, b) => {
					let indexOfA = retrievedColumns.findIndex(e => e.key === a.key);
					if (indexOfA === -1) {
						indexOfA = [...this.columnKeyDirectives].findIndex(e => e.columnKey === a.key);
					}
					let indexOfB = retrievedColumns.findIndex(e => e.key === b.key);
					if (indexOfB === -1) {
						indexOfB = [...this.columnKeyDirectives].findIndex(e => e.columnKey === b.key);
					}
					return indexOfA > indexOfB ? 1 : -1;
				});
			} else {
				this.definedColumns = this.columnKeyDirectives.map(e => ({key: e.columnKey, active: e.enabledByDefault}));
			}
		}
		this.headerKeys = keys
		.filter(key => this.columnKeyDirectives.some(e => e.columnKey === key))
		.filter(key => this.definedColumns.some(e => e.key === key && e.active !== false))
		.sort((a, b) => {
			return this.definedColumns.findIndex(e => e.key === a) > this.definedColumns.findIndex(e => e.key === b) ? 1 : -1;
		});

		keys.filter(key => this.columnKeyDirectives.some(e => e.columnKey === key)).forEach(key => {
			this.headerCaptionByKey.set(key, this.columnKeyDirectives.find(e => e.columnKey === key)?.columnCaption);
		});
		await awaitableForNextCycle();
	}

	private async calculateColumnWidths(): Promise<void> {
		console.log('calcu');
		this.columnWidthsToBeCalculated = true;
		await awaitableForNextCycle();
		const remInPx = Number(getComputedStyle(document.documentElement).fontSize.split('px')[0]);
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
		dynamicCols.forEach((e, i) => {
			const colDirective = this.columnKeyDirectives.find(col => col.columnKey === this.headerKeys[i]);
			if (colDirective.fixedWidthOnContents) {
				colDirective.minWidthInREM = Math.ceil(e.getBoundingClientRect().width) / remInPx;
				colDirective.maxWidthInREM = Math.ceil(e.getBoundingClientRect().width) / remInPx;
			}
		});

		const minWidthsCumulative = this.columnKeyDirectives.filter(e => {
			if (!this.headerKeys.includes(e.columnKey)) {
				return false;
			}
			return Number.isFinite(e.minWidthInREM);
		}).reduce((acc, cur) => (cur.minWidthInREM * remInPx) + acc, 0);

		const spaceLeftForDistribution = this.tableContainer.nativeElement.getBoundingClientRect().width - selectBoxWidth - lastColWidth;
		const bonusSpaceLeftInREM = (spaceLeftForDistribution - minWidthsCumulative) / remInPx;
		const spacings = this.distributeSpaceAfterMinWidths(bonusSpaceLeftInREM);
		dynamicCols.forEach((e, i) => {
			const colDirective = this.columnKeyDirectives.find(col => col.columnKey === this.headerKeys[i]);
			const colSpacings = spacings.find(sp => sp.col.columnKey === colDirective.columnKey);

			if (spaceLeftForDistribution < minWidthsCumulative) {
				if (Number.isFinite(colDirective.minWidthInREM)) {
					e.style.width = colDirective.minWidthInREM + 'rem';
				} else {
					e.style.width = '1rem';
				}
			} else {
				e.style.width = colDirective.minWidthInREM + colSpacings.bonusSpaceItTakes + 'rem';
			}
		});
		this.columnWidthsToBeCalculated = false;
	}

	private distributeSpaceAfterMinWidths(bonusSpaceLeftInREM: number): Array<{col: ColumnKeyDirective, maximumBonus: number, bonusSpaceItTakes: number}> {
		let cols = this.columnKeyDirectives.filter(e => {
			return this.headerKeys.includes(e.columnKey);
		}).map(e => {
			return {
				col: e,
				maximumBonus: Number.isFinite(e.maxWidthInREM) ? e.maxWidthInREM - e.minWidthInREM : Number.MAX_VALUE,
				bonusSpaceItTakes: 0,
			};
		});

		while (this.getSpaceToDistribute(bonusSpaceLeftInREM, cols) > 0) {
			const toStillDistribute = this.getSpaceToDistribute(bonusSpaceLeftInREM, cols);
			const ratiosCumulative = cols.reduce((acc, cur) => {
				if (cur.maximumBonus <= cur.bonusSpaceItTakes) {
					return acc;
				}
				return cur.col.growRatio + acc;
			}, 0);

			cols = cols.map(e => {
				return {
					...e,
					bonusSpaceItTakes: Math.min(e.maximumBonus, e.bonusSpaceItTakes + (toStillDistribute * (e.col.growRatio / ratiosCumulative))),
				};
			});
		}
		return cols;
	}

	private getSpaceToDistribute(bonusSpaceLeftInREM: number, cols: Array<{ col: ColumnKeyDirective; maximumBonus: number; bonusSpaceItTakes: number }>): number {
		const allMaximumsReached = cols.every(e => e.maximumBonus - e.bonusSpaceItTakes < 0.01); // 0.01 because of floating point precision
		if (allMaximumsReached) {
			return 0;
		}
		return bonusSpaceLeftInREM - cols.reduce((acc, cur) => cur.bonusSpaceItTakes + acc, 0);
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

	public rowClicked(row: any, index: number): void {
		this.onRowClicked.emit({row, index});
	}

	showActions(row: any): void {
		if (this.multipleRowsActionsShown) {
			this.closeActionMenu();
		}
		this.actionMenuOffset = {x: 0, y: 30};
		const actions = this.getActionsForRowFn?.(row) ?? [];
		this.actionMenuForRow = row;
		this.actions = actions;
		this.createBackdrop(() => {
			this.closeActionMenu();
		}, false);
	}

	showActionsMultipleRows(): void {
		this.multipleRowsActionsShown = true;
		this.actionMenuOffset = {x: 0, y: 30};
		const actions = this.getActionsForMultipleRowsFn(this.getSelectedRows()) ?? [];
		this.actions = actions;
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

	public openConfig = (): void => {
		this.showConfig = true;
		this.createBackdrop(() => this.closeConfig(), true);
	}


	public openFilters = () => {
		this.showFilters = true;
		this.createBackdrop(() => this.closeFilters(), true);
	};


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
		});
		document.body.appendChild(this.backdropDiv);
	}

	closeConfig(): void {
		this.showConfig = false;
		this.removeBackdropDiv();
	}

	closeFilters(): void {
		this.showFilters = false;
		this.removeBackdropDiv();
	}

	private removeBackdropDiv(): void {
		if (isValueSet(this.backdropDiv)) {
			document.body.removeChild(this.backdropDiv);
			this.backdropDiv = null;
		}
	}

	rowSelectClicked(row: WDTRow): void {
		this.setRowSelect(row, !this.isSelected(row));
		this.openMultipleActionsMenuIfMultipleRowsAreSelected();
	}

	private openMultipleActionsMenuIfMultipleRowsAreSelected(): void {
		if (this.getSelectedRows().length >= 2) {
			this.showActionsMultipleRows();
		} else {
			this.closeActionMenu();
		}
	}

	private setRowSelect(row: WDTRow, newState: boolean): void {
		this.selectedState.set(row.id, newState);
	}

	public getHeaderSelectState(): boolean | undefined {
		if (this.selectedState.size === 0) {
			return false;
		}
		if (this.getSelectedRows().length > 0 && this.getSelectedRows().length === this.pageData?.data?.length) {
			return true;
		} else if ([...this.selectedState.values()].every(e => e === false)) {
			return false;
		} else {
			return undefined;
		}
	}

	public isSelected(row: WDTRow): boolean {
		return this.selectedState.get(row.id) ?? false;
	}

	public getSelectedRows(): Array<WDTRow> {
		const selectedIds = [...this.selectedState.entries()]
			.filter(e => e[1] === true)
			.map(e => e[0]);
		const result = selectedIds.map(e => this.idByRow.get(e));
		return result;
	}

	headerSelectClicked(): void {
		const isSelected = this.getHeaderSelectState();

		if (isSelected === true) {
			this.pageData.data.forEach((row, i) => this.setRowSelect(row, false));
			return;
		} else if (isSelected === false) {
			this.pageData.data.forEach((row, i) => this.setRowSelect(row, true));
			this.openMultipleActionsMenuIfMultipleRowsAreSelected();
			return;
		} else if (isSelected === undefined) {
			this.pageData.data.forEach((row, i) => this.setRowSelect(row, true));
			this.openMultipleActionsMenuIfMultipleRowsAreSelected();
			return;
		}
		throw new Error(`invalid header select state ${isSelected}`);
	}

	itemsPerPageChanged(): void {
		this.page = 1;
		this.getData();
	}

	getShowActionsFn(row: Record<string, any>): (target) => void {
		return () => this.showActions(row);
	}

	getShowActionsMultipleFn(): (target) => void {
		return () => {
			if (this.multipleRowsActionsShown) {
				this.closeActionMenu();
				return;
			}
			this.showActionsMultipleRows();
		};
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

	public closeActionMenu(): void {
		this.actionMenuForRow = null;
		this.actions = null;
		this.multipleRowsActionsShown = false;
		this.removeBackdropDiv();
	}

	public hasAtLeastOneResult(): boolean {
		return this.pageData?.totalAmount > 0;
	}

	public _ext_refreshTable(): void {
		this.getData();
	}

	public async _ext_setFilters(filters: Record<string, any>): Promise<void> {
		this.activeFilters = filters;
		await awaitableForNextCycle();
		this.closeFilters();
		this.getData();
	}

	public async _ext_refetchItem(id: any): Promise<void> {
		const item = await this.fetchSingleItemFn(id);
		this.pageData = {
			...this.pageData,
			data: this.pageData.data.map(e => e.id === id ? item : e),
		};
	}

	public getNrOfActiveFilters(): number {
		return Object.keys(this.activeFilters ?? {}).length;
	}

	public _ext_getFilters(): Record<string, any> {
		return this.activeFilters;
	}

	public _ext_resetSelection(): void {
		this.selectedState = new Map();
	}

	public _ext_setMaxBatchSize(size: number): void {
		this.maxBatchSize = size;
	}

	public shouldShowSelectAcrossAllPagesTooltip(): boolean {
		if (this.selectAllAcrossPagesActive) {
			return true;
		}
		if (this.getSelectedRows()?.length === this.pageData?.totalAmount) {
			return false;
		}
		return this.getHeaderSelectState() === true;
	}

	ngOnDestroy(): void {
		window.document.removeEventListener('keyup', this.escapeKeyListener);
		window.document.removeEventListener('resize', this.resizeListener);
	}
}
