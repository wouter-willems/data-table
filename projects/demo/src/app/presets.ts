import { PresetValue } from "projects/wouter-willems/data-table/src/lib/data-table/data-table.component";

export const wdtColumnPresets: Record<string, PresetValue> =
	{
		name: { minWidthInREM: 15, growRatio: 'auto' },
		age: { fixedWidthOnContents: true , minWidthInREM: 10, growRatio: 10 },
		other: { fixedWidthOnContents: true , minWidthInREM: 10, growRatio: 20 },
	};
