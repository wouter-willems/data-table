import {NgModule} from '@angular/core';
import {ColumnKeyDirective, DataTableComponent} from './data-table/data-table.component';
import {CommonModule, JsonPipe} from "@angular/common";

@NgModule({
	declarations: [DataTableComponent, ColumnKeyDirective],
	imports: [
		CommonModule,
		JsonPipe
	],
	exports: [DataTableComponent, ColumnKeyDirective]
})
export class WutuDataTableModule {
}
