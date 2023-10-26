import {NgModule} from '@angular/core';
import {ColumnKeyDirective, DataTableComponent} from './data-table/data-table.component';
import {CommonModule, JsonPipe} from "@angular/common";
import {FormsModule} from "@angular/forms";

@NgModule({
	declarations: [DataTableComponent, ColumnKeyDirective],
	imports: [
		CommonModule,
		JsonPipe,
		FormsModule
	],
	exports: [DataTableComponent, ColumnKeyDirective]
})
export class WutuDataTableModule {
}
