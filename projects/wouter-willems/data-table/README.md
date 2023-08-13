# Klippa Grid Framework

## Usage
To use the grid system, first import it into your angular module:

```ts
import {NgModule} from '@angular/core';
import {NgxGridModule} from '@klippa/ngx-grid';

@NgModule({
	imports: [ NgxGridModule ],
	declarations: [ MyComponent ],
	exports: [ MyComponent ],
})
export class MyModule {}
```

Then use the components in the template:

```html
<klp-grid-container>
	<klp-grid-row>
		<klp-grid-column>
			<!-- ... -->
		</klp-grid-column>
	</klp-grid-row>
</klp-grid-container>
```

## Breakpoints

| Breakpoint | screen width | max container width |
| ---------- | ------------ | ------------------- |
| xs         | 0px          | 100%                |
| sm         | 576px        | 540px               |
| md         | 768px        | 720px               |
| lg         | 992px        | 960px               |
| xl         | 1200px       | 1140px              |
| xxl        | 1440px       | 1380px              |


## `<klp-grid-container>`

Grid containers cannot be nested at any level. Ideally, stick a grid container at the
highest level in your application as possible and forget about it.

It can optionally take two inputs: `fluid` and `gutter`.

```html
<klp-grid-container [fluid]="true" [gutter]="30">
```

`fluid` is false by default, in which case the grid container has a maximum width
set for each breakpoint as defined in the breakpoint section.

If `fluid` is true, no max width will be set and the grid container will completely
fill its parent.

`gutter` describes the gaps between columns in pixels

## `<klp-grid-row>`

Grid rows must have a parent container at some level. Their direct children can only be
grid columns. Any other child will throw an error.

## `<klp-grid-column>`

Grid columns must be a direct child of a row. Any other parent will throw an error.

They can have two optional inputs, `[width]` and `[offset]`.

Columns that overflow off the end of the row will be wrapped onto a new row.

### `[width]`

The width input is used for setting the width of each column at each breakpoint. 
It takes an object with the breakpoint labels as keys and column widths ranging from 0 to 12
as values. Each row is 12 columns wide, so a column with a width of 6 will take up half
the width of the row.

For example:

```html
<klp-grid-column [width]="{ xs: 12, sm: 8, lg: 6 }">
```

If the breakpoint is set to 0, it is not rendered. Otherwise, it will use the width of the
last specified breakpoint. So in the example width, it will be 12 wide on all screens smaller
than `sm`, 8 wide for screens wider than `sm` but smaller than `lg` (that includes `md`), then
finally 6 wide for all screens wider than `lg`.

### `[offset]`

The offset input takes an object of breakpoints much the same way as `[width]`, the
only notable difference is that the offset values must be between 1 and 11. 0 and 12 will
be ignored. offset adds "ghost" columns before a column.

For example:

```html
<klp-grid-column [width]="{ xs: 4 }"></klp-grid-column>
<klp-grid-column [width]="{ xs: 4 }" [offset]="{ xs: 4 }"></klp-grid-column>
```

Will produce two columns that are 1/3 of the containing row, with a 1/3 gap between them.
