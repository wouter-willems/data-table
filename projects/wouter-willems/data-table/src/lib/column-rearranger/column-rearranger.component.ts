import {
	Component,
	ElementRef,
	EventEmitter,
	InjectionToken,
	Injector,
	OnInit,
	Output,
	QueryList,
	TemplateRef,
	ViewChildren
} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from "@angular/forms";
import {isValueSet} from "../util/values";

export const SaveBtnRefToken = new InjectionToken('save btn');

@Component({
	selector: 'wutu-column-rearranger',
	templateUrl: './column-rearranger.component.html',
	styleUrls: ['./column-rearranger.component.scss'],
	providers: [{provide: NG_VALUE_ACCESSOR, useExisting: ColumnRearrangerComponent, multi: true}],
})
export class ColumnRearrangerComponent implements OnInit, ControlValueAccessor {

	@Output() onColumnsSaved = new EventEmitter();
	@Output() onCloseRequest = new EventEmitter();

	private changed = new Array<(value: any) => void>();
	private touched = new Array<() => void>();

	public columns: Array<{ key: string, active: boolean }> = [];

	@ViewChildren('dragItem') dragItems: QueryList<ElementRef>;
	public dragSourceIndex: number;
	private currentDragPosition: number;
	public saveBtnRef: TemplateRef<any>;

	constructor(private injector: Injector) {}

	ngOnInit(): void {
		setTimeout(() => {
			this.saveBtnRef = this.injector.get<TemplateRef<any>>(SaveBtnRefToken);
		});
	}

	registerOnChange(fn: any): void {
		this.changed.push(fn);
	}

	registerOnTouched(fn: any): void {
		this.touched.push(fn);
	}

	writeValue(obj: any): void {
		if (!isValueSet(obj)) {
			return;
		}
		console.log('obj');
		console.log(obj);
		this.columns = obj?.map(e => ({...e})) ?? [];
	}

	notify() {
		const valueToSet = this.columns?.map(e => ({...e})) ?? [];
		this.changed.forEach((fn) => fn(valueToSet));
	}

	dragStart($event: DragEvent) {
		this.dragSourceIndex = this.dragItems.map(e => e.nativeElement).findIndex(e => e === $event.target);
		this.currentDragPosition = this.dragSourceIndex;
	}

	dragEnter($event: DragEvent) {
		const targetIndex = this.dragItems.map(e => e.nativeElement).findIndex(e => e === ($event.target as HTMLElement));
		if (targetIndex === -1) {
			return;
		}
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

	submit = () => {
		this.notify();
		this.onColumnsSaved.emit();
		this.onCloseRequest.emit();
	}
}
