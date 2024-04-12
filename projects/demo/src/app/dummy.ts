import {WDTRow} from "../../../wouter-willems/data-table/src/lib/data-table/data-table.component";

export function getDummyData(start: number, searchQuery: string, itemsPerPage: number, sortField: string, sortOrder: 'ASC' | 'DESC', filters: Record<string, any>): {
	totalAmount: number,
	data: Array<WDTRow>
} {
	const allData: Array<WDTRow> = [];
	for (let i = 0; i < 107; i++) {
		allData.push({
			id: i,
			name: 'Person ' + i,
			age: 10 + i,
			address: {
				street: 'Streetname',
				number: 22 + i,
			},
			occupation: 'Software Architect #' + i,
		});
	}
	const filteredData = allData.filter((e) => e.name.includes(searchQuery ?? ''));
	const paged = filteredData.slice(start, start + itemsPerPage);
	return {
		totalAmount: filteredData.length,
		data: paged,
	};
}
