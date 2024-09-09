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
import {awaitableForNextCycle, runNextRenderCycle} from "../util/angular";
import {debounce, isEqual} from 'lodash';
import {SaveBtnRefToken} from "../column-rearranger/column-rearranger.component";

export const TranslationsToken = new InjectionToken('translations');
export const CheckBoxRefToken = new InjectionToken('checkbox');
export const ConfigBtnRefToken = new InjectionToken('config btn');
export const ActionMenuBtnRefToken = new InjectionToken('actionMenu');
export const ActionMenuMultipleBtnRefToken = new InjectionToken('actionMenu');
export const SearchInputRefToken = new InjectionToken('searchInput');
export const FilterBtnRefToken = new InjectionToken('filter btn');

export type PresetValue = {
	fixedWidthOnContents?: boolean,
	growRatio?: number | 'auto',
	minWidthInREM?: number,
	maxWidthInREM?: number,
	rightAligned?: boolean,
	emphasize?: number,
};

// tslint:disable-next-line:directive-selector
@Directive({selector: '[columnKey]'})
export class ColumnKeyDirective {
	@Input() columnKey;
	@Input() columnCaption;
	@Input() sortKey;
	@Input() defaultSort: 'ASC' | 'DESC';
	@Input() enabledByDefault: boolean = true;
	@Input() fixedWidthOnContents: boolean;
	@Input() growRatio: number | 'auto';
	@Input() minWidthInREM: number;
	@Input() maxWidthInREM: number;
	@Input() rightAligned: boolean;
	@Input() emphasize: number;
	@Input() preset: PresetValue;
	@Input() aggregationTpl: TemplateRef<any>;
	@Input() showTooltipOnOverflow = true;

	// the fields that start with an underscore hold values that we can alter within our component, without losing
	// what the user intended (which is stored in the non-underscored fields)
	public _minWidthInREM: number;
	public _maxWidthInREM: number;

	public getFixedWidthOnContents(): boolean {
		return this.fixedWidthOnContents ?? this.preset?.fixedWidthOnContents ?? false;
	}

	public getGrowRatio(): number | 'auto' {
		return this.growRatio ?? this.preset?.growRatio ?? 1;
	}

	public getMinWidthInREM(): number {
		return this.minWidthInREM ?? this.preset?.minWidthInREM;
	}

	public getMaxWidthInREM(): number {
		return this.maxWidthInREM ?? this.preset?.maxWidthInREM;
	}

	public getRightAligned(): boolean {
		return this.rightAligned ?? this.preset?.rightAligned ?? false;
	}

	public getEmphasize(): number {
		return this.emphasize ?? this.preset?.emphasize ?? 0;
	}
}

// tslint:disable-next-line:directive-selector
@Directive({selector: '[filterForm]'})
export class FilterFormDirective {
}

export type WDTRow = {id: any, backgroundVariant?: 1 | 2 | 3} & Record<string, any>;

@Component({
	selector: 'wutu-data-table',
	templateUrl: './data-table.component.html',
	styleUrls: ['./data-table.component.scss'],
})
export class DataTableComponent implements OnChanges, OnInit, OnDestroy {
	@ViewChild('selectBoxDummy') selectBoxDummy: ElementRef;
	@ViewChild('actionMenuDummy') actionMenuDummy: ElementRef;
	@ViewChild('configBtnDummy') configBtnDummy: ElementRef;
	@ViewChild('configButtonContainer') configButtonContainer: ElementRef;
	@ViewChild('actionMenuContainer') actionMenuContainer: ElementRef;
	@ViewChild('tableContainer') tableContainer: ElementRef;
	@ViewChild('actionMenu') actionMenu: ElementRef;

	@ContentChildren(ColumnKeyDirective, {read: TemplateRef}) templates: QueryList<TemplateRef<any>>;
	@ContentChildren(ColumnKeyDirective, {read: ColumnKeyDirective}) columnKeyDirectives: QueryList<ColumnKeyDirective>;
	@ContentChild(FilterFormDirective, {read: TemplateRef}) filterFormTpl: TemplateRef<any>;

	@Input() searchParams;
	@Input() showSearchField = true;
	@Input() allowSelectingAcrossMultiplePages = true;
	@Input() fetchItemsFn: (start: number, searchQuery: string, itemsPerPage: number, sortField: string, sortOrder: 'ASC' | 'DESC', filters: Record<string, any>) => Promise<{
		totalAmount: number,
		data: Array<WDTRow>
	}>;
	@Input() fetchItemByIds: (ids: Array<any>) => Promise<Array<WDTRow>>;
	@Input() getColumnAggregatedValuesFn: (data: Array<WDTRow>) => Promise<Record<string, any>>;
	@Input() getActionsForRowFn: (r: any) => Promise<Array<{
		caption: string,
		action: () => void,
	}>> | Array<{
		caption: string,
		action: () => void,
	}>;
	@Input() getActionsForMultipleRowsFn: (r: Array<any>) => Promise<Array<{
		caption: string,
		action: () => void,
	}>> | Array<{
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
	@Input() summaryTpl: TemplateRef<any>;
	@Output() onRowClicked = new EventEmitter<{row: any, index: number}>();
	@Output() onParamsChanged = new EventEmitter<any>();
	@Input() userResizableColumns: 'NO' | 'PERCENTAGE' | 'PIXEL' = 'NO';
	@Input() retrieveUserResizableColumnsFn: () => Promise<Record<string, number>>;
	@Input() persistUserResizableColumnsFn: (cols: Record<string, number>) => Promise<void>;

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
	public aggregatedValues: Record<string, any>;
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
	public actionMenuMultipleBtnRef: TemplateRef<any>;
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
	public hasHorizontalScroll: boolean;
	private tdResizing: {name: string, el: HTMLElement};
	private userDefinedWidths: Record<string, number>;

	constructor(private injector: Injector, private elRef: ElementRef) {}

	async ngOnInit(): Promise<void> {
		if (this.userResizableColumns !== 'NO') {
			this.userDefinedWidths = await this.retrieveUserResizableColumnsFn();
		}
		await awaitableForNextCycle();
		this.translations = this.injector.get<Record<string, string>>(TranslationsToken);
		this.checkboxRef = this.injector.get<TemplateRef<any>>(CheckBoxRefToken);
		this.configBtnRef = this.injector.get<TemplateRef<any>>(ConfigBtnRefToken);
		this.actionMenuBtnRef = this.injector.get<TemplateRef<any>>(ActionMenuBtnRefToken);
		this.actionMenuMultipleBtnRef = this.injector.get<TemplateRef<any>>(ActionMenuMultipleBtnRefToken);
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
				page: Number(c.page ?? 1),
				itemsPerPage: Number(c.itemsPerPage ?? 25),
				searchQuery: c.searchQuery,
				sortField: c.sortField,
				sortOrder: c.sortOrder
			};
			if (!isEqual(stateInternal, stateExternal)) {
				this.page = stateExternal.page;
				this.itemsPerPage = stateExternal.itemsPerPage;
				this.searchQuery = stateExternal.searchQuery;
				this.sortField = stateExternal.sortField;
				this.sortOrder = stateExternal.sortOrder;
				if (this.initiated) {
					this.getData().then(() => this.calculateColumnWidths());
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

		this.closeConfig();
		this.closeActionMenu();
		this.closeFilters();

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
		this.aggregatedValues = await this.getColumnAggregatedValuesFn?.(this.pageData.data);
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

	private getPXPerRem(): number {
		return Number(getComputedStyle(document.documentElement).fontSize.split('px')[0]);
	}

	private getDynamicCols(): Array<HTMLElement> {
		return [...this.elRef.nativeElement.querySelectorAll('thead td:not(.selectBoxContainer):not(.configButtonContainer)')];
	}

	private async calculateColumnWidths(): Promise<void> {
		this.columnWidthsToBeCalculated = true;
		await awaitableForNextCycle();
		const pxPerRem = this.getPXPerRem();
		const selectBoxWidth = this.selectBoxDummy ? Math.ceil(this.selectBoxDummy.nativeElement.getBoundingClientRect().width) : 0;
		const lastColWidth = Math.ceil(Math.max(this.actionMenuDummy.nativeElement.getBoundingClientRect().width, this.configBtnDummy.nativeElement.getBoundingClientRect().width));
		const selectBoxContainerRef = this.elRef.nativeElement.querySelector('thead td.selectBoxContainer');
		const configBtnContainerRef = this.elRef.nativeElement.querySelector('thead td.configButtonContainer');
		if (selectBoxContainerRef) {
			selectBoxContainerRef.style.width = `${selectBoxWidth}px`;
		}
		const dynamicCols = this.getDynamicCols();
		dynamicCols.forEach((e, i) => {
			const colDirective = this.columnKeyDirectives.find(col => col.columnKey === this.headerKeys[i]);
			const userDefinedWidth = this.userDefinedWidths?.[colDirective.columnKey];
			if (Number.isFinite(userDefinedWidth)) {
				if (this.userResizableColumns === 'PIXEL') {
					colDirective._minWidthInREM = userDefinedWidth;
					colDirective._maxWidthInREM = userDefinedWidth;
				} else if (this.userResizableColumns === 'PERCENTAGE') {
					const totalWidth = this.tableContainer.nativeElement.getBoundingClientRect().width;
					const widthInPx = totalWidth * (userDefinedWidth / 100);
					colDirective._minWidthInREM = widthInPx / pxPerRem;
					colDirective._maxWidthInREM = widthInPx / pxPerRem;
				}
			} else {
				if (colDirective.getFixedWidthOnContents()) {
					const actualWidth = Math.ceil(e.getBoundingClientRect().width) / pxPerRem;
					colDirective._minWidthInREM = Math.min(actualWidth, (colDirective.getMinWidthInREM() ?? Number.MAX_SAFE_INTEGER));
					colDirective._maxWidthInREM = Math.min(actualWidth, (colDirective.getMaxWidthInREM() ?? Number.MAX_SAFE_INTEGER));
				} else {
					colDirective._minWidthInREM = this.userDefinedWidths?.[colDirective.columnKey] ?? colDirective.getMinWidthInREM();
					colDirective._maxWidthInREM = this.userDefinedWidths?.[colDirective.columnKey] ?? colDirective.getMaxWidthInREM();
				}
			}
		});

		const minWidthsCumulative = this.columnKeyDirectives.filter(e => {
			if (!this.headerKeys.includes(e.columnKey)) {
				return false;
			}
			return Number.isFinite(e._minWidthInREM);
		}).reduce((acc, cur) => (cur._minWidthInREM * pxPerRem) + acc, 0);

		const spaceLeftForDistribution = this.tableContainer.nativeElement.getBoundingClientRect().width - selectBoxWidth - lastColWidth;
		const bonusSpaceLeftInREM = (spaceLeftForDistribution - minWidthsCumulative) / pxPerRem;
		this.hasHorizontalScroll = bonusSpaceLeftInREM < 0;
		if (configBtnContainerRef) {
			if (this.hasHorizontalScroll) {
				// when sticky, dont take all the extra spacings that the `lastColWidth` has. Instead, make it is large as the config button itself
				configBtnContainerRef.style.width = `${this.configButtonContainer.nativeElement.getBoundingClientRect().width}px`;
			} else {
				configBtnContainerRef.style.width = `${lastColWidth}px`;
			}
		}

		const spacings = this.distributeSpaceAfterMinWidths(bonusSpaceLeftInREM);
		dynamicCols.forEach((e, i) => {

			if (this.userResizableColumns !== 'NO' && i === dynamicCols.length - 1) {
				// last column has to have an auto width, otherwise the other columns can not be scaled
				return;
			}

			const colDirective = this.columnKeyDirectives.find(col => col.columnKey === this.headerKeys[i]);
			const colSpacings = spacings.find(sp => sp.col.columnKey === colDirective.columnKey);

			if (spaceLeftForDistribution < minWidthsCumulative) {
				if (Number.isFinite(colDirective._minWidthInREM)) {
					console.log(colDirective);
					e.style.width = colDirective._minWidthInREM + 'rem';
				} else {
					e.style.width = '1rem';
				}
			} else {
				if (colDirective.getGrowRatio() === 'auto') {
					e.style.width = 'auto';
				} else {
					e.style.width = colDirective._minWidthInREM + colSpacings.bonusSpaceItTakes + 'rem';
				}
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
				maximumBonus: Number.isFinite(e._maxWidthInREM) ? e._maxWidthInREM - e._minWidthInREM : Number.MAX_VALUE,
				bonusSpaceItTakes: 0,
			};
		});

		while (this.getSpaceToDistribute(bonusSpaceLeftInREM, cols) > 0) {
			const toStillDistribute = this.getSpaceToDistribute(bonusSpaceLeftInREM, cols);
			const ratiosCumulative = cols.reduce((acc, cur) => {
				if (cur.maximumBonus <= cur.bonusSpaceItTakes) {
					return acc;
				}
				const growRatio = cur.col.getGrowRatio();
				if (growRatio === 'auto') {
					return acc;
				}
				return growRatio + acc;
			}, 0);

			cols = cols.map(e => {
				const growRatio = e.col.getGrowRatio();
				if (growRatio === 'auto') {
					return {
						...e,
						bonusSpaceItTakes: 0,
					};
				}
				return {
					...e,
					bonusSpaceItTakes: Math.min(e.maximumBonus, e.bonusSpaceItTakes + (toStillDistribute * (growRatio / ratiosCumulative))),
				};
			});
		}
		return cols;
	}

	private getSpaceToDistribute(bonusSpaceLeftInREM: number, cols: Array<{ col: ColumnKeyDirective; maximumBonus: number; bonusSpaceItTakes: number }>): number {
		const allMaximumsReached = cols.every(e => {
			if (e.col.getGrowRatio() === 'auto') {
				return true;
			}
			return e.maximumBonus - e.bonusSpaceItTakes < 0.01;
		}); // 0.01 because of floating point precision
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

	public getTemplateForAggregation(header: string, value: any): TemplateRef<any> {
		if (!isValueSet(value))  {
			return;
		}
		return this.columnKeyDirectives.toArray().find(e => {
			return e.columnKey === header;
		})?.aggregationTpl;
	}

	public showTooltipOnOverflow(header: string): boolean {
		return this.columnKeyDirectives.toArray().find(e => {
			return e.columnKey === header;
		})?.showTooltipOnOverflow ?? true;
	}

	public isRightAligned(header: string): boolean {
		return this.columnKeyDirectives.toArray().find(e => {
			return e.columnKey === header;
		})?.getRightAligned() ?? false;
	}

	public getEmphasizeValue(header: string): number {
		return this.columnKeyDirectives.toArray().find(e => {
			return e.columnKey === header;
		})?.getEmphasize() ?? 0;
	}

	public rowClicked(row: any, index: number): void {
		this.onRowClicked.emit({row, index});
	}

	async showActions(row: any): Promise<void> {
		if (this.multipleRowsActionsShown) {
			this.closeActionMenu();
		}
		this.actionMenuOffset = {x: 0, y: 15};
		const actions = (await this.getActionsForRowFn?.(row)) ?? [];
		this.actionMenuForRow = row;
		this.actions = actions;
		this.createBackdrop(() => {
			this.closeActionMenu();
		}, false);
		runNextRenderCycle(() => {
			const x = this.actionMenu.nativeElement.getBoundingClientRect().left;
			const y = this.actionMenu.nativeElement.getBoundingClientRect().top;
			this.actionMenu.nativeElement.style.position = 'fixed';
			this.actionMenu.nativeElement.style.left = `${x}px`;
			this.actionMenu.nativeElement.style.top = `${y}px`;
			this.actionMenu.nativeElement.style.visibility = 'visible';
			document.body.appendChild(this.actionMenu.nativeElement);
		});
	}

	async showActionsMultipleRows(): Promise<void> {
		const actions = (await this.getActionsForMultipleRowsFn(this.getSelectedRows())) ?? [];
		this.multipleRowsActionsShown = true;
		this.actionMenuOffset = {x: 0, y: 40};
		this.actions = actions;
	}

	hasActionMenuOpen(): boolean {
		return isValueSet(this.actionMenuForRow);
	}

	getPageNumbers(): Array<number> {
		const totalPages = this.getLastPage();
		const allPageNumbers = [...Array(totalPages).keys()].map(i => i + 1);
		const filtered = allPageNumbers.filter(i => Math.abs(i - this.page) < 5);
		if (!filtered.includes(1)) {
			filtered[0] = 1;
			if (filtered[1] !== 2) {
				filtered[1] = null;
			}
		}
		if (!filtered.includes(allPageNumbers[allPageNumbers.length - 1])) {
			filtered[filtered.length - 1] = allPageNumbers[allPageNumbers.length - 1];
			if (filtered[filtered.length - 2] !== allPageNumbers[allPageNumbers.length - 2]) {
				filtered[filtered.length - 2] = null;
			}
		}
		return filtered;
	}

	public getLastPage(): number {
		return Math.ceil(this.pageData.totalAmount / (this.itemsPerPage ?? 1));
	}

	public async toPage(pageNr: number): Promise<void> {
		this.page = pageNr;
		await this.getData();
		await this.calculateColumnWidths();
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
		if (this.getSelectedRows().length >= 1) {
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
		if (this.selectAllAcrossPagesActive) {
			return;
		}
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
			const defaultSortField = this.columnKeyDirectives.find(e => stringIsSetAndFilled(e.defaultSort));
			if (defaultSortField?.columnKey === headerKey) {
				this.sortOrder = 'ASC';
			} else {
				this.sortOrder = null;
				this.sortField = null;
			}
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
		if (this.actionMenu?.nativeElement && document.body.contains(this.actionMenu.nativeElement)) {
			document.body.removeChild(this.actionMenu.nativeElement);
		}
		this.removeBackdropDiv();
	}

	public hasAtLeastOneResult(): boolean {
		return this.pageData?.totalAmount > 0;
	}

	public _ext_refreshTable(): void {
		this.getData();
	}

	public async _ext_triggerWidthCalculation(): Promise<void> {
		await this.calculateColumnWidths();
	};

	public async _ext_setFilters(filters: Record<string, any>): Promise<void> {
		this.page = 1;
		this.activeFilters = filters;
		await awaitableForNextCycle();
		this.closeFilters();
		this.getData();
	}

	public async _ext_refetchItems(ids: Array<any>): Promise<void> {
		const items = await this.fetchItemByIds(ids);
		this.pageData = {
			...this.pageData,
			data: this.pageData.data.map(e => {
				const foundItem = items.find(i => i.id === e.id);
				return foundItem ?? e;
			}),
		};
	}

	public _ext_hasItemVisibleWithId(id: any): boolean {
		return this.pageData?.data?.some(e => e.id === id) ?? false;
	}

	public _ext_isColumnEnabled(columnKey: string): boolean {
		return this.headerKeys.includes(columnKey);
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

	public _ext_isItemVisible(id: any): boolean {
		return this.pageData?.data?.some(e => e.id === id);
	}

	public shouldShowSelectAcrossAllPages(): boolean {
		if (!this.allowSelectingAcrossMultiplePages) {
			return false;
		}
		if (this.selectAllAcrossPagesActive) {
			return true;
		}
		if (this.getSelectedRows()?.length === this.pageData?.totalAmount) {
			return false;
		}
		return this.getHeaderSelectState() === true;
	}

	public getTopLeftInfoToShow(): 'pagination' | 'selection' {
		if (arrayIsSetAndFilled(this.getSelectedRows())) {
			return 'selection';
		}
		return 'pagination';
	}

	ngOnDestroy(): void {
		window.document.removeEventListener('keyup', this.escapeKeyListener);
		window.document.removeEventListener('resize', this.resizeListener);
		this.closeConfig();
		this.closeActionMenu();
		this.closeFilters();
	}

	private prevX = null;
	public onResizeMouseDown(ev: MouseEvent, headerKey: string, td: HTMLElement): void {
		this.prevX = ev.screenX;
		this.tdResizing = {name: headerKey, el: td};
		window.document.addEventListener('mousemove', this.onMouseMove);
		window.document.addEventListener('mouseup', this.onResizeMouseUp);
	}

	private onResizeMouseUp = (): void => {
		const pxPerRem = this.getPXPerRem();
		this.persistUserResizedColumns(this.tdResizing.name, this.tdResizing.el.getBoundingClientRect().width / pxPerRem);
		this.prevX = null;
		this.tdResizing = null;
		window.document.removeEventListener('mousemove', this.onMouseMove);
		window.document.removeEventListener('mouseup', this.onResizeMouseUp);
		window.getSelection?.().removeAllRanges?.();
	};

	private onMouseMove = (ev: MouseEvent) => {
		const diff = ev.screenX - this.prevX;
		const pxPerRem = this.getPXPerRem();
		const newWidth = `${Math.max(4, (this.tdResizing.el.getBoundingClientRect().width + diff) / pxPerRem)}rem`;
		this.tdResizing.el.style.width = newWidth;
		this.prevX = ev.screenX;
	};

	private async persistUserResizedColumns(headerKey: string, widthInRem: number): Promise<void> {
		const existing = (await this.retrieveUserResizableColumnsFn()) ?? {};
		if (this.userResizableColumns === 'PIXEL') {
			existing[headerKey] = widthInRem;
			await this.persistUserResizableColumnsFn(existing);
		}
		else if (this.userResizableColumns === 'PERCENTAGE') {
			const dynamicCols = this.getDynamicCols();
			const totalWidthInPx = this.tableContainer.nativeElement.getBoundingClientRect().width;
			dynamicCols.forEach((e, i) => {
				const colDirective = this.columnKeyDirectives.find(col => col.columnKey === this.headerKeys[i]);
				existing[colDirective.columnKey] = e.getBoundingClientRect().width / totalWidthInPx * 100;
			});

			await this.persistUserResizableColumnsFn(existing);
		}
	}

	public getTotalAmountOfCols(): number {
		return [...this.elRef.nativeElement.querySelectorAll('thead td')].length;
	}
}
