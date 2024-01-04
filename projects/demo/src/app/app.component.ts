import {Component, inject, OnInit, TemplateRef, ViewChild} from '@angular/core';
import {
	ActionMenuBtnRefToken,
	CheckBoxRefToken,
	ConfigBtnRefToken,
	SearchInputRefToken, ToggleRefToken
} from 'projects/wouter-willems/data-table/src/public-api';
import {
	SaveBtnRefToken
} from "../../../wouter-willems/data-table/src/lib/column-rearranger/column-rearranger.component";
import {ActivatedRoute, Router} from "@angular/router";

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

	public searchQuery: string;

	constructor(private router: Router, private activatedRoute: ActivatedRoute) {
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

	fetchItemsFn = async (start: number, searchQuery: string, itemsPerPage: number, sortField: string, sortOrder: 'ASC' | 'DESC'): Promise<{
		totalAmount: number,
		data: Array<Record<string, any>>
	}> => {
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

	setQuery(searchQuery2: any) {
		this.searchQuery = searchQuery2;
	}
}
