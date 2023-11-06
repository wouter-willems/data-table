import {Component, InjectionToken, OnInit, TemplateRef, ViewChild} from '@angular/core';
import { MyTestToken } from 'projects/wouter-willems/data-table/src/public-api';
import {MyToggleComponent} from "../my-toggle/my-toggle.component";
import {ControlValueAccessor} from "@angular/forms";

const data  = [
	{
		id: 123,
		id2: 123,
		id23: 123,
		name: 'Wutu',
		age: 36,
		id24: 123,
		address: {
			street: 'Apenlaan',
			number: 22,
		}
	}, {
		name: 'Gert',
		age: 22,
		address: {
			street: 'Belgie 34',
			number: 101,
		}
	},
	{
		name: 'Samson met een naam',
		age: 22,
		breed: 'Hond',
		comments: 'ik ben een hond',
	},
];

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss'],
	providers: [{
		provide: MyTestToken,
		useValue: MyToggleComponent,
	}]
})
export class AppComponent implements OnInit {

	getActionsForRowFn = (e) => {
		console.log(e);
		return [{
			caption: 'pick me',
			action: () => {
				console.log('chosen pick me');
				console.log(e);
			}
		}, {
			caption: 'pick other',
			action: () => {
				console.log('chosen other');
				console.log(e);
			}
		}];
	};

	fetchItemsFn: (start: number, itemsPerPage: number) => Promise<{
		totalAmount: number,
		data: Array<Record<string, any>>
	}> = async (start: number) => {
		console.log('start', start);
		if (start === 96) {
			return {
				totalAmount: 98,
				data: [data[0], data[2]],
			};
		}
		return {
			totalAmount: 98,
			data: data.map(e => ({...e, name: e.name + '#' + start})),
		};
	};

	ngOnInit(): void {

	}

	onRowClicked($event: any) {
		console.log('$event');
		console.log($event);
	}
}
