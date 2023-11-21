import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';

import {AppComponent} from './app.component';
import {WutuDataTableModule} from "../../../wouter-willems/data-table/src/lib/wutu-data-table.module";
import {RouterModule} from "@angular/router";
import {MyToggleComponent} from "../my-toggle/my-toggle.component";
import {FormsModule} from "@angular/forms";

@NgModule({
	declarations: [
		AppComponent,
		MyToggleComponent,
	],
	imports: [
		BrowserModule,
		RouterModule,
		WutuDataTableModule,
		FormsModule,
		RouterModule.forRoot([]),
	],
	providers: [],
	bootstrap: [AppComponent]
})
export class AppModule {
}
