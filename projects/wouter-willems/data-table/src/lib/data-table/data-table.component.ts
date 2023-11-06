import {
	AfterViewInit,
	Component,
	ContentChildren,
	Directive,
	EventEmitter, InjectionToken, Injector,
	Input,
	OnChanges,
	OnInit,
	Output,
	QueryList,
	SimpleChanges,
	TemplateRef,
	ViewChild,
	ViewChildren,
	ViewContainerRef
} from '@angular/core';
import {arrayIsSetAndFilled, removeDuplicatesFromArray} from '../util/arrays';
import {isValueSet} from '../util/values';
import {MyToggleComponent} from '../../../../../demo/src/my-toggle/my-toggle.component';
import {ControlValueAccessor} from "@angular/forms";

export const MyTestToken = new InjectionToken('myTest');

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
	@ContentChildren(ColumnKeyDirective, {read: TemplateRef}) templates: QueryList<TemplateRef<any>>;
	@ContentChildren(ColumnKeyDirective, {read: ColumnKeyDirective}) columnKeyDirectives: QueryList<ColumnKeyDirective>;

	@ViewChild('headerSelect', {read: ViewContainerRef}) headerSelect: ViewContainerRef;
	@ViewChildren('rowSelect', {read: ViewContainerRef}) rowSelects: QueryList<ViewContainerRef>;

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
	public definedColumns: Array<{ key: string, active: boolean }>;
	public showConfig: boolean = false;
	private backdropDiv: HTMLDivElement;
	public selectedState: Map<Record<string, any>, boolean> = new Map();
	private headerSelectComp: any;
	private rowSelectComps: Array<ControlValueAccessor>;

	constructor(private injector: Injector) {

	}

	async ngOnInit(): Promise<void> {
		setTimeout(() => {
			console.log(MyToggleComponent);
			const injected = this.injector.get<any>(MyTestToken);
			console.log('injected');
			console.log(injected);
			this.headerSelectComp = this.headerSelect.createComponent(injected).instance;
		});
		await this.getData();
	}


	ngOnChanges(simpleChanges: SimpleChanges): void {
		if (isValueSet(simpleChanges.currentPage)) {
			this.toPage(simpleChanges.currentPage.currentValue);
		}
	}

	private async getData(): Promise<void> {
		this.stuff = await this.fetchItemsFn((this.currentPage - 1) * (this.itemsPerPage ?? 1), (this.itemsPerPage ?? 1));
		this.stuff.data.forEach(e => this.selectedState.set(e, false));
		this.extractHeaders();
	}

	private extractHeaders(): void {
		const keys = removeDuplicatesFromArray(Object.values(this.stuff.data).map(e => {
			return Object.keys(e);
		}).reduce((acc, cur) => {
			return [...acc, ...cur];
		}, []));
		if (!arrayIsSetAndFilled(this.definedColumns)) {
			this.definedColumns = this.columnKeyDirectives.map(e => e.columnKey).map(e => ({key: e, active: true}));
		}
		this.headerKeys = keys
		.filter(key => this.columnKeyDirectives.some(e => e.columnKey === key))
		.filter(key => this.definedColumns.some(e => e.key === key && e.active !== false))
		.sort((a, b) => {
			return this.definedColumns.findIndex(e => e.key === a) > this.definedColumns.findIndex(e => e.key === b) ? 1 : -1;
		});
		this.headers = this.headerKeys.map(key => this.columnKeyDirectives.find(e => e.columnKey === key)?.columnCaption);

		setTimeout(() => {
			this.rowSelectComps = this.rowSelects
			.map(e => e.createComponent(MyToggleComponent))
				.map(e => e.instance)
			;
		});
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

	openConfig(): void {
		this.showConfig = true;
		this.backdropDiv = document.createElement('div');
		this.backdropDiv.style.background = 'black';
		this.backdropDiv.style.opacity = '0.5';
		this.backdropDiv.style.position = 'fixed';
		this.backdropDiv.style.top = '0';
		this.backdropDiv.style.right = '0';
		this.backdropDiv.style.bottom = '0';
		this.backdropDiv.style.left = '0';
		document.body.appendChild(this.backdropDiv);
	}

	closeConfig() {
		this.showConfig = false;
		document.body.removeChild(this.backdropDiv);
	}

	rowSelectClicked(row: Record<string, any>, i: number): void {
		this.setRowSelect(row, i, !this.selectedState.get(row));
		this.setHeaderSelectState();
	}

	private setRowSelect(row: Record<string, any>, i: number, newState: boolean): void {
		this.selectedState.set(row, newState);
		this.rowSelectComps[i].writeValue(newState);
	}

	private setHeaderSelectState(): void {
		if ([...this.selectedState.values()].every(e => e === true)) {
			this.headerSelectComp.writeValue(true);
		} else if ([...this.selectedState.values()].every(e => e === false)) {
			this.headerSelectComp.writeValue(false);
		} else {
			this.headerSelectComp.writeValue(undefined);
		}
	}

	headerSelectClicked(): void {
		if ([...this.selectedState.values()].every(e => e === true)) {
			this.stuff.data.forEach((row, i) => this.setRowSelect(row, i, false));
		} else if ([...this.selectedState.values()].every(e => e === false)) {
			this.stuff.data.forEach((row, i) => this.setRowSelect(row, i, true));
		} else {
			this.stuff.data.forEach((row, i) => this.setRowSelect(row, i, true));
		}
		this.setHeaderSelectState();
	}
}
