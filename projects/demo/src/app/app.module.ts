import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';

import {AppComponent} from './app.component';
import {WutuDataTableModule} from "../../../wouter-willems/data-table/src/lib/wutu-data-table.module";

@NgModule({
	declarations: [
		AppComponent
	],
	imports: [
		BrowserModule,
		WutuDataTableModule,
	],
	providers: [],
	bootstrap: [AppComponent]
})
export class AppModule {
}
