import {Component, OnInit} from '@angular/core';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
	public myData = [
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
		}, {
			name: 'Samson met een lange naaaaaaaaaaaaaaaaaam',
			age: 22,
			breed: 'Hond',
			comments: 'ik ben een hond, en ik woon bij gertje in zn huis',
		},
	];

	public headers: { [k in Required<keyof typeof this.myData[number]>]: string } = {
		name: 'NAAMPJE',
		age: 'leeftijd',
		address: 'miaow',
		breed: 'soort',
		comments: 'Commentaar'
	};

	mapRowToHeaderFn: (e: string) => string = (e) => {
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
