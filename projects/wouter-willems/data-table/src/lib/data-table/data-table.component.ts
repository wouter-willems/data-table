import {
	Component,
	ContentChild,
	ContentChildren,
	Directive,
	EventEmitter,
	Input,
	OnChanges,
	Output,
	SimpleChanges,
	TemplateRef
} from '@angular/core';
import {removeDuplicatesFromArray} from "../util/arrays";
import {isValueSet} from "../util/values";

// tslint:disable-next-line:directive-selector
@Directive({ selector: '[columnKey]' })
export class ColumnKeyDirective {
	@Input() columnKey;
}

@Component({
	selector: 'wutu-data-table',
	templateUrl: './data-table.component.html',
	styleUrls: ['./data-table.component.scss'],
})
export class DataTableComponent implements OnChanges {
	@ContentChildren(ColumnKeyDirective, { read: TemplateRef }) template;
	@ContentChildren(ColumnKeyDirective, { read: ColumnKeyDirective }) zagen;
	@Input() data = [];
	@Input() mapRowToHeaderFn: (s: string) => string;
	@Input() getActionsForRowFn: (r: any) => Array<any>;
	@Output() onRowClicked = new EventEmitter<any>();
	public headerKeys: Array<string> = [];
	public headers: Array<string> = [];

	constructor() {
		setTimeout(() => {
			console.log(this.template);
			console.log(this.zagen.toArray());
		}, 100);
	}

	ngOnChanges(simpleChanges: SimpleChanges): void {
		this.extractHeaders(simpleChanges.data.currentValue);
	}

	private extractHeaders(obj): void {
		const keys = removeDuplicatesFromArray(Object.values(obj).map(e => {
			return Object.keys(e);
		}).reduce((acc, cur) => {
			return [...acc, ...cur];
		}, []));
		this.headerKeys = keys;
		const headers = keys.map(this.mapRowToHeaderFn);
		this.headers = headers;
	}

	public getTemplate(header: string, value: any): TemplateRef<any> {
		const index = this.zagen.toArray().findIndex(e => {
			return e.columnKey === header;
		});
		if (isValueSet(value)) {
			return this.template.toArray()[index];
		}
		return null;
	}

	public rowClicked(row: any): void {
		console.log(row);
		this.onRowClicked.emit(row);
	}

	showActions(row: any) {
		const actions = this.getActionsForRowFn(row);
		actions[0].action();
		console.log(actions);
	}
}
