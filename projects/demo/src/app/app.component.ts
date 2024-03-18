import {Component, inject, OnInit, TemplateRef, ViewChild} from '@angular/core';
import {
	ActionMenuBtnRefToken,
	CheckBoxRefToken,
	ConfigBtnRefToken, DataTableComponent, FilterBtnRefToken,
	SearchInputRefToken, ToggleRefToken
} from 'projects/wouter-willems/data-table/src/public-api';
import {
	SaveBtnRefToken
} from "../../../wouter-willems/data-table/src/lib/column-rearranger/column-rearranger.component";
import {ActivatedRoute, Router} from "@angular/router";
import {FormControl, FormGroup, Validators } from '@angular/forms';

const data  = [
	{
		id: 1,
		name: 'Wutu',
		age: 36,
		address: {
			street: 'Streetname',
			number: 22,
		},
		occupation: 'Software Architect',
	}, {
		id: 2,
		name: 'John',
		age: 22,
		address: {
			street: 'Some street',
			number: 123,
		},
		occupation: 'Lawyer',
	},
	{
		id: 3,
		name: 'Lance',
		age: 47,
		address: {
			street: 'Sim City',
			number: 88,
		},
		occupation: 'Astronaut',
	}
];

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
	@ViewChild('searchInput') searchInput: TemplateRef<any>;
	@ViewChild('filterButton') filterButton: TemplateRef<any>;
	@ViewChild('filterForm') filterForm: TemplateRef<any>;
	@ViewChild(DataTableComponent) dataTableComponent: DataTableComponent;

	public searchQuery: string;
	public myFilterForm: FormGroup;

	constructor(private router: Router, private activatedRoute: ActivatedRoute) {
		this.myFilterForm = new FormGroup({
			name: new FormControl('', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]),
			email: new FormControl('', [Validators.required, Validators.email])
		});
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
		}];
	};

	getActionsForMultipleRowsFn = (rows: Array<any>): Array<{
		caption: string,
		action: () => void,
	}> => {
		return [{
			caption: 'Export ALL',
			action: () => {
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
		data: Array<Record<string, any>>
	}> => {
		console.log(start, searchQuery, itemsPerPage, sortField, sortOrder, filters);
		if (searchQuery === 'empty') {
			return {
				totalAmount: 0,
				data: [],
			};
		}
		if (start === 96) {
			return {
				totalAmount: 98,
				data: [data[0], data[2]],
			};
		}
		return {
			totalAmount: 98,
			data: data.map(e => ({...e, name: e.name + '#' + start})),
		};
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


	ngOnInit(): void {

	}

	onRowClicked($event: any) {
		console.log('$event');
		console.log($event);
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
