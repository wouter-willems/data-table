export type PresetValue = {
	fixedWidthOnContents?: boolean,
	growRatio?: number,
	minWidthInREM?: number,
	maxWidthInREM?: number,
};
export const wdtColumnPresets: Record<string, PresetValue> =
	{name: {growRatio: 1, minWidthInREM: 10, maxWidthInREM: 11}};
console.log(wdtColumnPresets);
