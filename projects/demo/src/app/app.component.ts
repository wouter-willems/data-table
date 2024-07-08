import {Component, inject, OnInit, TemplateRef, ViewChild} from '@angular/core';
import {
	ActionMenuBtnRefToken,
	CheckBoxRefToken,
	ConfigBtnRefToken, DataTableComponent, WDTRow, FilterBtnRefToken,
	SearchInputRefToken, ToggleRefToken, ActionMenuMultipleBtnRefToken
} from 'projects/wouter-willems/data-table/src/public-api';
import {
	SaveBtnRefToken
} from "../../../wouter-willems/data-table/src/lib/column-rearranger/column-rearranger.component";
import {ActivatedRoute, Router} from "@angular/router";
import {FormControl, FormGroup, Validators } from '@angular/forms';
import {getDummyData, getSingleDummyItem} from "./dummy";


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
		}
	]
})
export class AppComponent implements OnInit {

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
	private expandedInfo: { name: string; index: number };

	constructor(private router: Router, private activatedRoute: ActivatedRoute) {
		this.myFilterForm = new FormGroup({
			name: new FormControl('', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]),
			email: new FormControl('', [Validators.required, Validators.email])
		});

		setTimeout(() => {
			this.dataTableComponent._ext_refetchItem(7);
		}, 2000);
	}

	getActionsForRowFn = (row: any): Array<{
		caption: string,
		action: () => void,
	}> => {
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

	getActionsForMultipleRowsFn = (rows: Array<any>): Array<{
		caption: string,
		action: () => void,
	}> => {
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
		console.log(start, searchQuery, itemsPerPage, sortField, sortOrder, filters);
		if (searchQuery === 'empty') {
			return {
				totalAmount: 0,
				data: [],
			};
		}
		await new Promise(resolve => setTimeout(resolve, 100));
		const data = getDummyData(start, searchQuery, itemsPerPage, sortField, sortOrder, filters);
		return data;
	};

	updateSingleItemFn = async (id: any): Promise<WDTRow> => {
		console.log('zoekeuh', id);
		return getSingleDummyItem(id, true);
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


	ngOnInit(): void {

	}

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
			queryParams,
			queryParamsHandling: 'merge',
		});
	}

	public getSearchParams() {
		return this.activatedRoute.snapshot.queryParams;
	}

	public setQuery(searchQuery2: any): void {
		this.searchQuery = searchQuery2;
	}

	public setFilters(): void {
		this.dataTableComponent._ext_setFilters(this.myFilterForm.value);
	}
}
