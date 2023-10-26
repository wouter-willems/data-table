import {Component, OnInit} from '@angular/core';

const data  = [
	{
		name: 'Wutu',
		age: 36,
		address: {
			street: 'Apenlaan',
			number: 22,
		}
	}, {
		name: 'Samson',
		age: 22,
		breed: 'Hond',
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
	styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

	public headers: { [k in Required<keyof typeof data[number]>]: string } = {
		name: 'NAAMPJE',
		age: 'leeftijd',
		address: 'miaow waar',
		breed: 'soort',
		comments: 'Commentaar'
	};

	mapColumnKeyToHeaderCaptionFn: (e: string) => string = (e) => {
		console.log(e);
		return this.headers[e];
	};

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

	fetchItemsFn: (start: number) => Promise<{
		totalAmount: number,
		data: Array<Record<string, any>>
	}> = async (start: number) => {
		console.log('start', start);
		if (start === 96) {
			return {
				totalAmount: 98,
				data: [data[0], data[3]],
			};
		}
		return {
			totalAmount: 98,
			data: data.map(e => ({...e, name: e.name + '#' + start})),
		};
	};

	ngOnInit(): void {

	}

	asColKey(e: keyof typeof this.headers): keyof typeof this.headers {
		return e;
	}

	onRowClicked($event: any) {
		console.log('$event');
		console.log($event);
	}
}
