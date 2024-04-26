import {
	Component,
	ElementRef,
	EventEmitter,
	InjectionToken,
	Injector,
	Input, OnDestroy,
	OnInit,
	Output,
	QueryList,
	TemplateRef,
	ViewChildren
} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from "@angular/forms";
import {isValueSet} from "../util/values";

export const SaveBtnRefToken = new InjectionToken('save btn');
export const ToggleRefToken = new InjectionToken('toggle btn');

@Component({
	selector: 'wutu-column-rearranger',
	templateUrl: './column-rearranger.component.html',
	styleUrls: ['./column-rearranger.component.scss'],
	providers: [{provide: NG_VALUE_ACCESSOR, useExisting: ColumnRearrangerComponent, multi: true}],
})
export class ColumnRearrangerComponent implements OnInit, OnDestroy, ControlValueAccessor {

	@Input() headerCaptionByKey: Map<string, string>;
	@Output() onColumnsSaved = new EventEmitter();
	@Output() onCloseRequest = new EventEmitter();

	private changed = new Array<(value: any) => void>();
	private touched = new Array<() => void>();

	public columns: Array<{ key: string, active: boolean }> = [];

	@ViewChildren('dragItem') dragItems: QueryList<ElementRef>;
	public dragSourceIndex: number;
	private currentDragPosition: number;
	public saveBtnRef: TemplateRef<any>;
	public toggleBtnRef: TemplateRef<any>;
	private escapeKeyListener: (ev) => void;

	constructor(private injector: Injector) {}

	ngOnInit(): void {
		setTimeout(() => {
			this.saveBtnRef = this.injector.get<TemplateRef<any>>(SaveBtnRefToken);
			this.toggleBtnRef = this.injector.get<TemplateRef<any>>(ToggleRefToken);
		});
		this.escapeKeyListener = (ev) => {
			if (ev.key === 'Escape') {
				this.onCloseRequest.emit();
			}
		};
		window.document.addEventListener('keyup', this.escapeKeyListener);
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
		this.columns = obj?.map(e => ({...e})) ?? [];
	}

	notify(): void {
		const valueToSet = this.columns?.map(e => ({...e})) ?? [];
		this.changed.forEach((fn) => fn(valueToSet));
	}

	dragStart($event: DragEvent): void {
		$event.dataTransfer.effectAllowed = 'move';
		this.dragSourceIndex = this.dragItems.map(e => e.nativeElement).findIndex(e => e === $event.target);
		this.currentDragPosition = this.dragSourceIndex;
	}

	dragEnter($event: DragEvent): void {
		$event.dataTransfer.dropEffect = 'move';
		const targetIndex = this.dragItems.map(e => e.nativeElement).findIndex(e => e === ($event.target as HTMLElement));
		if (targetIndex === -1) {
			return;
		}
		this.currentDragPosition = targetIndex;
	}

	dragEnd($event: DragEvent): void {
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

	shouldShoveDown(index: number): boolean {
		return this.dragSourceIndex > index && this.currentDragPosition <= index;
	}

	shouldShoveUp(index: number): boolean {
		return this.dragSourceIndex < index && this.currentDragPosition >= index;
	}

	getTransform(i): number {
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

	ngOnDestroy(): void {
		window.document.removeEventListener('keyup', this.escapeKeyListener);
	}
}
