import { NgModule } from '@angular/core';
import {ColumnKeyDirective, DataTableComponent} from './data-table/data-table.component';
import {JsonPipe} from "@angular/common";
import {BrowserModule} from "@angular/platform-browser";

@NgModule({
	declarations: [DataTableComponent, ColumnKeyDirective],
	imports: [
		BrowserModule,
		JsonPipe
	],
	exports: [DataTableComponent, ColumnKeyDirective]
})
export class WutuDataTableModule { }
