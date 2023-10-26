import {
	Component,
	ContentChildren,
	Directive,
	EventEmitter,
	Input,
	OnChanges,
	OnInit,
	Output, QueryList,
	SimpleChanges,
	TemplateRef
} from '@angular/core';
import {removeDuplicatesFromArray} from "../util/arrays";
import {isValueSet} from "../util/values";

// tslint:disable-next-line:directive-selector
@Directive({selector: '[columnKey]'})
export class ColumnKeyDirective {
	@Input() columnKey;
	@Input() columnCaption;
}

@Component({
	selector: 'wutu-data-table',
	templateUrl: './data-table.component.html',
	styleUrls: ['./data-table.component.scss'],
})
export class DataTableComponent implements OnChanges, OnInit {
	@ContentChildren(ColumnKeyDirective, {read: TemplateRef}) templates: QueryList<TemplateRef<any>> ;
	@ContentChildren(ColumnKeyDirective, {read: ColumnKeyDirective}) columnKeyDirectives: QueryList<ColumnKeyDirective>;
	@Input() fetchItemsFn: (start: number, itemsPerPage: number) => Promise<{
		totalAmount: number,
		data: Array<Record<string, any>>
	}>;
	@Input() getActionsForRowFn: (r: any) => Array<any>;
	@Input() public currentPage = 1;
	@Output() onRowClicked = new EventEmitter<any>();
	@Output() onPageChange = new EventEmitter<number>();

	public itemsPerPage = 3;
	public headerKeys: Array<string> = [];
	public headers: Array<string> = [];
	public stuff: { totalAmount: number; data: Array<Record<string, any>> };
	public actions: any[];
	public actionMenuActionForRow: any;

	constructor() {
		setTimeout(() => {
			// console.log(this.columnKeyDirectives.toArray());
		}, 100);
	}

	async ngOnInit(): Promise<void> {
		this.getData();
	}

	ngOnChanges(simpleChanges: SimpleChanges): void {
		if (isValueSet(simpleChanges.currentPage)) {
			this.toPage(simpleChanges.currentPage.currentValue);
		}
	}

	private async getData(): Promise<void> {
		this.stuff = await this.fetchItemsFn((this.currentPage - 1) * (this.itemsPerPage ?? 1), (this.itemsPerPage ?? 1));
		this.extractHeaders();
	}

	private extractHeaders(): void {
		const keys = removeDuplicatesFromArray(Object.values(this.stuff.data).map(e => {
			return Object.keys(e);
		}).reduce((acc, cur) => {
			return [...acc, ...cur];
		}, []));
		this.headerKeys = keys.filter(key => this.columnKeyDirectives.some(e => e.columnKey === key));
		this.headers = this.headerKeys.map(key => this.columnKeyDirectives.find(e => e.columnKey === key)?.columnCaption);
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
		console.log(row);
		this.onRowClicked.emit(row);
	}

	showActions(row: any): void {
		const actions = this.getActionsForRowFn(row);
		console.log(actions);
		this.actionMenuActionForRow = row;
		this.actions = actions;
		// actions[0].action();
		// console.log(actions);
	}

	getPageNumbers(): Array<number> {
		const totalPages = this.getLastPage();
		const allPageNumbers = [...Array(totalPages).keys()].map(i => i + 1);
		return allPageNumbers.filter(i => Math.abs(i - this.currentPage) < 4);
	}

	public getLastPage(): number {
		return Math.ceil(this.stuff.totalAmount / (this.itemsPerPage ?? 1));
	}

	toPage(pageNr: number) {
		this.currentPage = pageNr;
		this.onPageChange.emit(pageNr);

		this.getData();
	}
}
