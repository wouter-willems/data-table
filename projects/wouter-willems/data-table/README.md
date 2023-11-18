# Wutu Data Tables
This library aims to simplify creating data tables for Angular applications.

## Most important features

- Customizable column widths
  - Fixed based on contents
  - Fixed based on `rem` units
  - Percentage based by providing ratios
- Automatically generated interface to drag and drop the order how the columns are displayed
- Hover tooltips when data is truncated because the width of a column is smaller than its contents
- Action menu's for each row
- Automatically generated pagination
- Make a selection of one or more rows
- Sort (ascending and descending) for each column

## Example
### Template

```html
<wutu-data-table
    [fetchItemsFn]="fetchItemsFn"
    [getActionsForRowFn]="getActionsForRowFn"
    (onRowClicked)="onRowClicked($event)"
>
    <ng-template columnKey="name" columnCaption="Full name" defaultSort="DESC" let-value="value" [fixedWidthInREM]="6">
        {{value}}
    </ng-template>
    <ng-template columnKey="age" columnCaption="Age" let-value="value" [fixedWidthOnContents]="true">
        {{value}} years old
    </ng-template>
    <ng-template columnKey="address" columnCaption="Address" let-value="value">
        {{value.street}} at number {{value.number}}
    </ng-template>
    <ng-template columnKey="occupation" columnCaption="Occupation" let-value="value">
        {{value}}
    </ng-template>
</wutu-data-table>
```

### Controller

```ts
fetchItemsFn = async (
    start: number,
    searchQuery: string,
    itemsPerPage: number,
    sortField: string,
    sortOrder: 'ASC' | 'DESC',
): Promise<{ totalAmount: number; data: Array<Category> }> => {
    const filters = {
      start: start,
      max: itemsPerPage,
      searchQuery: searchQuery,
      sort: sortField,
      order: sortOrder,
    }
    const result = await this.someApiCall(filters);
    return {
        totalAmount: result.count,
        data: result.entries,
    };
};

getActionsForRowFn = (): Array<{
	caption: string,
	action: () => void,
}> => {
	return [{
		caption: 'Export',
		action: () => {
			console.log('chosen Export');
		}
	}, {
		caption: 'Delete',
		action: () => {
			console.log('chosen Delete');
		}
	}];
};

onRowClicked(row) {
	console.log('row was clicked', row);
}
```
