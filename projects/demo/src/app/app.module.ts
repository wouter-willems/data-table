import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';

import {AppComponent} from './app.component';
import {WutuDataTableModule} from "../../../wouter-willems/data-table/src/lib/wutu-data-table.module";
import {RouterModule} from "@angular/router";

@NgModule({
	declarations: [
		AppComponent
	],
	imports: [
		BrowserModule,
		RouterModule,
		WutuDataTableModule,
	],
	providers: [],
	bootstrap: [AppComponent]
})
export class AppModule {
}
