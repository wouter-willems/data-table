import {AfterViewInit, Component, inject, OnInit, TemplateRef, ViewChild} from '@angular/core';
import {
	ActionMenuBtnRefToken,
	CheckBoxRefToken,
	ConfigBtnRefToken, DataTableComponent, WDTRow, FilterBtnRefToken,
	SearchInputRefToken, ToggleRefToken, ActionMenuMultipleBtnRefToken, TranslationsToken
} from 'projects/wouter-willems/data-table/src/public-api';
import {
	SaveBtnRefToken
} from "../../../wouter-willems/data-table/src/lib/column-rearranger/column-rearranger.component";
import {ActivatedRoute, Router} from "@angular/router";
import {FormControl, FormGroup, Validators } from '@angular/forms';
import {getDummyData, getSingleDummyItem} from "./dummy";
import {wdtColumnPresets} from "./presets";
import {memoize} from "lodash";
import {stringIsSetAndFilled} from "../../../wouter-willems/data-table/src/lib/util/values";


@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss'],
	providers: [
		{
			provide: CheckBoxRefToken,
			useFactory: () => inject(AppComponent, {self: true}).myToggle,
		}, {
			provide: ConfigBtnRefToken,
			useFactory: () => inject(AppComponent, {self: true}).configBtn,
		}, {
			provide: ToggleRefToken,
			useFactory: () => inject(AppComponent, {self: true}).toggleBtn,
		},
		{
			provide: SaveBtnRefToken,
			useFactory: () => inject(AppComponent, {self: true}).saveBtn,
		}, {
			provide: ActionMenuBtnRefToken,
			useFactory: () => inject(AppComponent, {self: true}).actionMenuBtn,
		}, {
			provide: ActionMenuMultipleBtnRefToken,
			useFactory: () => inject(AppComponent, {self: true}).actionMenuMultipleBtn,
		}, {
			provide: SearchInputRefToken,
			useFactory: () => inject(AppComponent, {self: true}).searchInput,
		}, {
			provide: FilterBtnRefToken,
			useFactory: () => inject(AppComponent, {self: true}).filterButton,
		},
	]
})
export class AppComponent implements AfterViewInit {

	@ViewChild('myToggle') myToggle: TemplateRef<any>;
	@ViewChild('configBtn') configBtn: TemplateRef<any>;
	@ViewChild('toggleBtnRef') toggleBtn: TemplateRef<any>;
	@ViewChild('saveBtn') saveBtn: TemplateRef<any>;
	@ViewChild('actionMenuBtn') actionMenuBtn: TemplateRef<any>;
	@ViewChild('actionMenuMultipleBtn') actionMenuMultipleBtn: TemplateRef<any>;
	@ViewChild('searchInput') searchInput: TemplateRef<any>;
	@ViewChild('filterButton') filterButton: TemplateRef<any>;
	@ViewChild('filterForm') filterForm: TemplateRef<any>;
	@ViewChild('expandedTpl') expandedTpl: TemplateRef<any>;
	@ViewChild(DataTableComponent) dataTableComponent: DataTableComponent;

	public searchQuery: string;
	public myFilterForm: FormGroup;
	public presets = wdtColumnPresets;
	private expandedInfo: { name: string; index: number };

	constructor(private router: Router, private activatedRoute: ActivatedRoute) {
		this.myFilterForm = new FormGroup({
			name: new FormControl('', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]),
			email: new FormControl('', [Validators.required, Validators.email])
		});

		setTimeout(() => {
			this.dataTableComponent._ext_refetchItems([7, 11]);
		}, 3000);
	}

	ngAfterViewInit(): void {
		this.dataTableComponent._ext_initialize(this.myFilterForm, { name: 'john' }, (val) => {
			return stringIsSetAndFilled(val);
		});
		this.dataTableComponent._ext_setPageChangeListener((prevPage, newPage) => {
			console.log(prevPage, newPage);
		});
	}

	getActionsForRowFn = async (row: any): Promise<Array<{
		caption: string,
		action: () => void,
	}>> => {
		await new Promise(resolve => setTimeout(resolve, 200));
		return [{
			caption: 'Export',
			action: () => {
				console.log('chosen Export');
			}
		}, {
			caption: 'Delete',
			action: () => {
				console.log('chosen Delete');
			}
		}, {
			caption: 'Something else',
			action: () => {
				console.log('chosen else');
			}
		}
		];
	};

	getActionsForMultipleRowsFn = async (rows: Array<any>): Promise<Array<{
		caption: string,
		action: () => void,
	}>> => {
		await new Promise(resolve => setTimeout(resolve, 300));
		return [{
			caption: 'Export ALL',
			action: () => {
				console.log(rows);
				console.log('chosen Export ALL');
			}
		}, {
			caption: 'Delete ALL',
			action: () => {
				console.log('chosen Delete ALL');
			}
		}];
	};

	fetchItemsFn = async (start: number, searchQuery: string, itemsPerPage: number, sortField: string, sortOrder: 'ASC' | 'DESC', filters: Record<string, any>): Promise<{
		totalAmount: number,
		data: Array<WDTRow>
	}> => {
		console.log('fetch', filters);
		console.log(start, searchQuery, itemsPerPage, sortField, sortOrder);
		if (searchQuery === 'empty') {
			return {
				totalAmount: 0,
				data: [],
			};
		}
		await new Promise(resolve => setTimeout(resolve, 3000));
		const data = getDummyData(start, searchQuery, itemsPerPage, sortField, sortOrder, filters);
		return data;
	};

	getColumnAggregatedValuesFn = async (data: Array<WDTRow>): Promise<Record<string, any>> => {
		return {
			occupation: 'Aggregated',
		};
	};

	updateItemsById = async (ids: Array<any>): Promise<Array<WDTRow>> => {
		return ids.map(e => getSingleDummyItem(e, true));
	};

	retrieveColumns = async (): Promise<Array<{
		key: string,
		active: boolean,
	}>> => {
		try {
			return JSON.parse(localStorage.getItem('cols'));
		} catch (e) {
			return [];
		}
	}

	persistColumns = async (r: Array<{
		key: string,
		active: boolean,
	}>): Promise<void> => {
		localStorage.setItem('cols', JSON.stringify(r));
	}

	getFilterObject = () => {
		// return this.myFilterForm.
	};

	getExpandedTplFn = (): {index: number, tpl: TemplateRef<any>} => {
		if (!Number.isFinite(this.expandedInfo?.index)) {
			return;
		}
		return {
			index: this.expandedInfo.index, tpl: this.expandedTpl
		};
	};

	retrieveUserResizableColumnsFn = async (): Promise<Record<string, number>> => {
		try {
			return JSON.parse(localStorage.getItem('resizableCols'));
		} catch (e) {
			return {};
		}
	};

	persistUserResizableColumnsFn = async (cols: Record<string, number>): Promise<void> => {
		localStorage.setItem('resizableCols', JSON.stringify(cols));
	};

	onRowClicked($event: any) {
		console.log('$event');
		console.log($event);
		if ($event.index === this.expandedInfo?.index) {
			this.expandedInfo = null;
			return;
		}
		this.expandedInfo = {
			index: $event.index,
			name: 'John Doe',
		};
	}

	public async updateRoute(queryParams) {
		await this.router.navigate([], {
			relativeTo: this.activatedRoute,
			queryParams: {
				page: queryParams.page,
				sortField: queryParams.sortField,
				sortOrder: queryParams.sortOrder,
				itemsPerPage: queryParams.itemsPerPage,
				searchQuery: queryParams.searchQuery,
			},
			queryParamsHandling: 'merge',
		});
	}

	public getSearchParams() {
		const q =  this.activatedRoute.snapshot.queryParams;
		return {
			itemsPerPage: q.itemsPerPage,
			page: Number(q.page),
			sortField: q.sortField,
			sortOrder: q.sortOrder,
			searchQuery: q.searchQuery,
		};
	}

	public setQuery(searchQuery2: any): void {
		this.searchQuery = searchQuery2;
	}

	public setFilters(): void {
		this.dataTableComponent._ext_triggerFilterSearch();
	}

	getDelayed = memoize(() => {
		return new Promise(resolve => {
			setTimeout(() => {
				resolve('Delayed');
			}, 200);
		});
	});

	tabs: Array<{ caption: string; count: number; isSelected: boolean; onClick: () => void }> = [{
		caption: 'To do', count: 13, isSelected: false, onClick: () => {
			console.log('click');
		}
	},
		{
			caption: 'All items', count: 46, isSelected: true, onClick: () => {
				console.log('click 2');
			}
		}
	];

	dataRetrieved(data: { totalAmount: number; data: Array<WDTRow>; aggregatedValues: Record<string, any> }) {
		console.log(data);
	}
}
