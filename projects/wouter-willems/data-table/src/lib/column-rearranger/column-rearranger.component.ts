import {Component, OnInit} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from "@angular/forms";

@Component({
	selector: 'wutu-column-rearranger',
	templateUrl: './column-rearranger.component.html',
	styleUrls: ['./column-rearranger.component.scss'],
	providers: [{provide: NG_VALUE_ACCESSOR, useExisting: ColumnRearrangerComponent, multi: true}],
})
export class ColumnRearrangerComponent implements OnInit, ControlValueAccessor {

	private changed = new Array<(value: any) => void>();
	private touched = new Array<() => void>();

	public columns: Array<{ key: string, active: boolean }> = [];

	constructor() {
	}

	ngOnInit(): void {
	}

	registerOnChange(fn: any): void {
		this.changed.push(fn);
	}

	registerOnTouched(fn: any): void {
		this.touched.push(fn);
	}

	writeValue(obj: any): void {
		console.log('obj');
		console.log(obj);
		this.columns = obj?.map(e => ({...e})) ?? [];
	}

	notify() {
		const valueToSet = this.columns?.map(e => ({...e})) ?? [];
		this.changed.forEach((fn) => fn(valueToSet));
	}
}
