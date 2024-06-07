import {WDTRow} from "../../../wouter-willems/data-table/src/lib/data-table/data-table.component";

export function getDummyData(start: number, searchQuery: string, itemsPerPage: number, sortField: string, sortOrder: 'ASC' | 'DESC', filters: Record<string, any>): {
	totalAmount: number,
	data: Array<WDTRow>
} {
	const allData: Array<WDTRow> = [];
	for (let i = 0; i < 107; i++) {
		allData.push(getSingleDummyItem(i));
	}
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
		name: 'Person ' + id + (updatedName ? ' (updated)' : '(nooo)'),
		age: 10 + id,
		address: {
			street: 'Streetname',
			number: 22 + id,
		},
		occupation: 'Software Architect #' + id,
		newlyAdded: 'abc',
	};
}
