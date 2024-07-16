import {WDTRow} from "../../../wouter-willems/data-table/src/lib/data-table/data-table.component";

export function getDummyData(start: number, searchQuery: string, itemsPerPage: number, sortField: string, sortOrder: 'ASC' | 'DESC', filters: Record<string, any>): {
	totalAmount: number,
	data: Array<WDTRow>
} {
	const allData: Array<WDTRow> = [];
	for (let i = 0; i < 107; i++) {
		allData.push(getSingleDummyItem(i));
	}
	allData[20].occupation = 'Loooooooooooooooooooooong Software Architect #20 - Loooooooooooooooooooooong';
	allData[5].backgroundVariant = 1;
	const filteredData = allData.filter((e) => e.name.includes(searchQuery ?? ''));
	const paged = filteredData.slice(start, start + itemsPerPage);
	return {
		totalAmount: filteredData.length,
		data: paged,
	};
}

export function getSingleDummyItem(id: any, updatedName = false): WDTRow {
	return {
		id,
		name: 'Person ' + id + (updatedName ? ' (updatedupdatedu pdatedupdated updatedupdatedu pdatedupdated updatedupdate dupdatedupdated)' : '(nooo)'),
		age: 10 + id,
		address: {
			street: 'Streetname',
			number: 22 + id,
		},
		occupation: 'Software Architect #' + id,
		newlyAdded: 'abc',
		shalala: 'shalalashalala shalalashalala shalalashalalashalalashalalashalala shalalashalalashalalashalalashalala',
	};
}
