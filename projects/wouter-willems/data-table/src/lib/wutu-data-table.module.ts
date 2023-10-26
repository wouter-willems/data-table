import {NgModule} from '@angular/core';
import {ColumnKeyDirective, DataTableComponent} from './data-table/data-table.component';
import {CommonModule, JsonPipe} from "@angular/common";
import {FormsModule} from "@angular/forms";
import { ColumnRearrangerComponent } from './column-rearranger/column-rearranger.component';

@NgModule({
	declarations: [DataTableComponent, ColumnKeyDirective, ColumnRearrangerComponent],
	imports: [
		CommonModule,
		JsonPipe,
		FormsModule
	],
	exports: [DataTableComponent, ColumnKeyDirective]
})
export class WutuDataTableModule {
}
