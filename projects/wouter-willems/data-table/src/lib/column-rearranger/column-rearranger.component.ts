import {Component, ElementRef, OnInit, QueryList, ViewChildren} from '@angular/core';
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

	@ViewChildren('dragItem') dragItems: QueryList<ElementRef>;
	public dragSourceIndex: number;
	private currentDragPosition: number;

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

	dragStart($event: DragEvent) {
		console.log($event);
		console.log(this.dragItems);
		this.dragSourceIndex = this.dragItems.map(e => e.nativeElement).findIndex(e => e === $event.target);
		this.currentDragPosition = this.dragSourceIndex;
	}

	dragOver($event: DragEvent) {
		console.log($event);
	}

	dragEnter($event: DragEvent) {
		console.log($event.target);
		const targetIndex = this.dragItems.map(e => e.nativeElement).findIndex(e => e === ($event.target as HTMLElement));
		if (targetIndex === -1) {
			return;
		}
		console.log(targetIndex);
		this.currentDragPosition = targetIndex;
	}

	dragEnd($event: DragEvent) {
		const movedElement = this.columns[this.dragSourceIndex];
		const isMovedToLastPlace = this.currentDragPosition === this.columns.length - 1;
		this.columns = this.columns
			.filter((e) => e !== movedElement)
			.reduce((acc, cur, i) => {
				if (i === this.currentDragPosition) {
					return [...acc, movedElement, cur];
				}
				return [...acc, cur];
			}, []);
		if (isMovedToLastPlace) {
			this.columns = [...this.columns, movedElement];
		}
		this.currentDragPosition = -1;
		this.dragSourceIndex = -1;
	}

	shouldShoveDown(index: number) {
		return this.dragSourceIndex > index && this.currentDragPosition <= index;
	}

	shouldShoveUp(index: number) {
		return this.dragSourceIndex < index && this.currentDragPosition >= index;
	}

	getTransform(i) {
		if (i !== this.dragSourceIndex) {
			if (this.shouldShoveUp(i)) {
				return -100;
			}
			if (this.shouldShoveDown(i)) {
				return 100;
			}
			return 0;
		}
		const diff = this.currentDragPosition - this.dragSourceIndex;
		return diff * 100;
	}
}
