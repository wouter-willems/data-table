import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';

import {AppComponent} from './app.component';
import {WutuDataTableModule} from "../../../wouter-willems/data-table/src/lib/wutu-data-table.module";
import {RouterModule} from "@angular/router";
import {MyToggleComponent} from "../my-toggle/my-toggle.component";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {TranslationsToken} from "../../../wouter-willems/data-table/src/lib/data-table/data-table.component";

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
		ReactiveFormsModule,
		RouterModule.forRoot([]),
	],
	providers: [
		{
			provide: TranslationsToken, useValue: {
				'First': 'Eerste',
				'Configure your table': 'Configureer je tabel',
			}
		},
	],
	bootstrap: [AppComponent]
})
export class AppModule {
}
