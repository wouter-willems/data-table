import {
	Component,
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
	TemplateRef
} from '@angular/core';
import {arrayIsSetAndFilled, removeDuplicatesFromArray} from '../util/arrays';
import {isValueSet} from '../util/values';
import {awaitableForNextCycle} from "../util/angular";

export const CheckBoxRefToken = new InjectionToken('checkbox');
export const ConfigBtnRefToken = new InjectionToken('config btn');

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

	@Input() horizontalScroll = false;
	@Input() fetchItemsFn: (start: number, itemsPerPage: number) => Promise<{
		totalAmount: number,
		data: Array<Record<string, any>>
	}>;
	@Input() getActionsForRowFn: (r: any) => Array<any>;
	@Input() public currentPage = 1;
	@Output() onRowClicked = new EventEmitter<any>();
	@Output() onPageChange = new EventEmitter<number>();

	public columnWidthsToBeCalculated = true;

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

	public checkboxRef: TemplateRef<any>;
	public configBtnRef: TemplateRef<any>;
	public actionMenuOffset: { x: number, y: number };

	constructor(private injector: Injector, private elRef: ElementRef) {

	}

	async ngOnInit(): Promise<void> {
		this.columnWidthsToBeCalculated = !this.horizontalScroll;
		setTimeout(() => {
			this.checkboxRef = this.injector.get<TemplateRef<any>>(CheckBoxRefToken);
			this.configBtnRef = this.injector.get<TemplateRef<any>>(ConfigBtnRefToken);
		});
		await this.getData();
		if (!this.horizontalScroll) {
			this.calculateColumnWidths();
		}
	}


	ngOnChanges(simpleChanges: SimpleChanges): void {
		if (isValueSet(simpleChanges.currentPage)) {
			this.toPage(simpleChanges.currentPage.currentValue);
		}
	}

	private async getData(): Promise<void> {
		this.stuff = await this.fetchItemsFn((this.currentPage - 1) * (this.itemsPerPage ?? 1), (this.itemsPerPage ?? 1));
		this.stuff.data.forEach(e => this.selectedState.set(e, false));
		await this.extractHeaders();
	}

	private async extractHeaders(): Promise<void> {
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
		await awaitableForNextCycle();
	}

	private calculateColumnWidths(): void {
		const staticCols = [...this.elRef.nativeElement.querySelectorAll('thead td:first-child, thead td:last-child')];
		staticCols.forEach((e, i) => e.style.width = `${e.getBoundingClientRect().width}px`);
		const dynamicCols = [...this.elRef.nativeElement.querySelectorAll('thead td:not(:first-child):not(:last-child)')];
		console.log(dynamicCols);
		const widths = dynamicCols.map(e => {
			return e.getBoundingClientRect().width;
		});
		const totalWidth = widths.reduce((acc, cur) => acc + cur, 0);
		const percentages = widths.map(e => e / totalWidth * 100);
		dynamicCols.forEach((e, i) => e.style.width = `${percentages[i]}%`);
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
		console.log(row);
		this.onRowClicked.emit(row);
	}

	showActions(row: any, target: EventTarget): void {
		this.actionMenuOffset = {
			x: (target as HTMLElement).getBoundingClientRect().right - this.elRef.nativeElement.getBoundingClientRect().right,
			y: (target as HTMLElement).getBoundingClientRect().top - this.elRef.nativeElement.getBoundingClientRect().top,
		};
		const actions = this.getActionsForRowFn(row);
		this.actionMenuActionForRow = row;
		this.actions = actions;
		this.createBackdrop(() => {
			this.actionMenuActionForRow = null;
			this.actions = null;
		}, false);
	}

	hasActionMenuOpen() {
		return isValueSet(this.actionMenuActionForRow);
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

	closeConfig() {
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
			this.stuff.data.forEach((row, i) => this.setRowSelect(row, false));
		} else if ([...this.selectedState.values()].every(e => e === false)) {
			this.stuff.data.forEach((row, i) => this.setRowSelect(row, true));
		} else {
			this.stuff.data.forEach((row, i) => this.setRowSelect(row, true));
		}
	}
}
