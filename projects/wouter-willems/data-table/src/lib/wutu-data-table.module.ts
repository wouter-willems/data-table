import {NgModule} from '@angular/core';
import {ColumnKeyDirective, DataTableComponent} from './data-table/data-table.component';
import {CommonModule, JsonPipe} from "@angular/common";
import {FormsModule} from "@angular/forms";
import { ColumnRearrangerComponent } from './column-rearranger/column-rearranger.component';
import { LibStyleComponent } from './lib-style/lib-style.component';
import {WithTooltipDirective} from "./withTooltip.component";

@NgModule({
	declarations: [DataTableComponent, ColumnKeyDirective, ColumnRearrangerComponent, LibStyleComponent, WithTooltipDirective],
	imports: [
		CommonModule,
		JsonPipe,
		FormsModule
	],
	exports: [DataTableComponent, ColumnKeyDirective, ColumnRearrangerComponent]
})
export class WutuDataTableModule {
}
