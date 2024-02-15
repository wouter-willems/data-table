import { isEqual, merge } from 'lodash';
import {isValueSet, stringIsSetAndFilled } from './values';

export function mapObjectValues<O, T>(myObject: O, mapFn: (e: O[keyof O]) => T): Record<keyof O, T> {
	return Object.entries(myObject)
		.map(([key, value]) => {
			return { key, value: mapFn(value) };
		})
		.reduce((acc, cur) => {
			return { ...acc, [cur.key]: cur.value };
		}, {} as Record<keyof O, T>);
}

export function filterEmptyStringValues(object: Record<any, string>): Record<any, string> {
	return Object.entries(object).reduce((acc, cur) => {
		if (stringIsSetAndFilled(cur[1])) {
			return { ...acc, [cur[0]]: cur[1] };
		}
		return acc;
	}, {});
}

export function filterUndefinedValues(object: Record<any, string>): Record<any, string> {
	return Object.entries(object).reduce((acc, cur) => {
		if (cur[1] !== undefined) {
			return { ...acc, [cur[0]]: cur[1] };
		}
		return acc;
	}, {});
}

export function filterUnsetValues(object: Record<any, any>): Record<any, string> {
	return Object.entries(object).reduce((acc, cur) => {
		if (isValueSet(cur[1])) {
			return { ...acc, [cur[0]]: cur[1] };
		}
		return acc;
	}, {});
}

export function filterObjectOnCondition(object: Record<any, any>, fn: (kvp) => boolean): Record<any, any> {
	return Object.entries(object).reduce((acc, cur) => {
		if (fn(cur)) {
			return { ...acc, [cur[0]]: cur[1] };
		}
		return acc;
	}, {});
}

export function objectToQueryParamString(object: Record<string, string | number>): string {
	const mappedToString = mapObjectValues(object, (e) => e?.toString());
	const filtered = filterEmptyStringValues(mappedToString);
	return Object.entries(filtered)
		.map(([key, val]) => `${key}=${val}`)
		.join('&');
}

export function deepMerge<A extends object | Array<any>, B extends object | Array<any>>(objA: A, objB: B): A | B {
	return merge(objA, objB);
}

// changedValues holds the values that are changed along with what it used to be
export function getChangedValues<T extends string>(current: Record<T, any>, prevFormValue: Record<T, any>): Map<T, any> {
	const changedValues: Map<T, any> = Object.entries(current)
		.filter(([key, val]) => {
			return !isEqual(prevFormValue?.[key], val);
		})
		.reduce((acc, [key]) => {
			acc.set(key as T, prevFormValue?.[key]);
			return acc;
		}, new Map<T, any>());
	return changedValues;
}

export function flattenObject(obj: Record<any, any>, shouldFlatten: (propName: string) => boolean, result = {}) {
	Object.entries(obj).forEach(([key, value]) => {
		if (shouldFlatten(key)) {
			flattenObject(value, shouldFlatten, result);
		} else {
			result[key] = value;
		}
	});
	return result;
}
