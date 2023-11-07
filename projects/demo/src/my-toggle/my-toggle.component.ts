import {Component, OnInit} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from "@angular/forms";

@Component({
	selector: 'app-my-toggle',
	templateUrl: './my-toggle.component.html',
	styleUrls: ['./my-toggle.component.scss'],
	providers: [{provide: NG_VALUE_ACCESSOR, useExisting: MyToggleComponent, multi: true}],
})
export class MyToggleComponent implements ControlValueAccessor {
	private changed = new Array<(value: any) => void>();
	private touched = new Array<() => void>();

	public innerValue: boolean = null;

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
		if (obj === undefined) {
			this.innerValue = undefined;
		} else {
			this.innerValue = obj === true;
		}
	}

}
