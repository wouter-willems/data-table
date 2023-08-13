import { isArray, isEqual } from 'lodash';
import { isValueSet } from './values';

export function removeDuplicatesFromArraysWithComparator(comparator: (e1: any, e2: any) => boolean, ...arrays: any[]): any {
	let combined = [];

	for (const array of arrays) {
		combined = combined.concat(array);
	}

	return combined.filter((c, i) => {
		const firstOccurrenceIndex = combined.findIndex((c2) => comparator(c, c2));
		return i === firstOccurrenceIndex;
	});
}

export function removeDuplicatesFromArray(array: Array<any>) {
	return array.filter((c, i) => {
		const firstOccurrenceIndex = array.findIndex((c2) => c2 === c);
		return i === firstOccurrenceIndex;
	});
}

export function insertAtIndex(arr, index, item) {
	arr.splice(index, 0, item);
}

export function arrayIsSetAndFilled(arr: any) {
	return isArray(arr) && arr !== null && arr !== undefined && arr.length > 0;
}

export function asArray(value: any): Array<any> {
	if (isValueSet(value)) {
		if (Array.isArray(value)) {
			return value;
		}
		return [value];
	}
	return [];
}

export function areArraysEqual(arr1: any, arr2: any): boolean {
	return isEqual(arr1, arr2);
}

export function arraysContainSameElements(arr1: Array<any>, arr2: Array<any>): boolean {
	if (arr1.length !== arr2.length) {
		return false;
	}
	return arr1.every((e) => arr2.includes(e));
}

export function splitArrayByCondition<T>(value: Array<T>, condition: (current: T) => boolean): Array<Array<T>> {
	return value.reduce(
		(acc, cur) => {
			if (condition(cur)) {
				acc.push([]);
			} else {
				acc[acc.length - 1].push(cur);
			}
			return acc;
		},
		[[]],
	);
}

export function getObjectFromKeyValuePairs(array: any[][]): Object {
	return array.reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
}

export function intersectionOfArrays<T>(arr1: Array<T>, arr2: Array<T>): Array<T> {
	return arr1.filter((value) => arr2.includes(value));
}
