import { isArray, isDate, isObject } from 'radash';
import { arraysEqual } from './array';
import { isNil } from './utils';

export const shallowEqual = (a: any, b: any) => {
  if (Object.is(a, b)) return true;

  if (!isObject(a) || !isObject(b)) return false;

  const ka = Object.keys(a);

  const kb = Object.keys(b);

  if (ka.length !== kb.length) return false;

  for (const k of ka) if (!Object.is(a[k as keyof typeof a], (b as Record<string, any>)[k])) return false;

  return true;
};

export const isObjectType = (value: unknown): value is object => typeof value === 'object';

export const isEventObject = (event: unknown): event is Event => {
  return isObject(event) || (!isArray(event) && !isNil(event) && isObjectType(event) && !isDate(event));
};

// function diff<T extends object>(
//   oldObj: T,
//   newObj: T,
//   ignoreFields: (keyof T)[] = [],
// ): { [K in keyof T]?: Diff<T[K]> } | null {
//   const difference: { [K in keyof T]?: Diff<T[K]> } = {};

//   for (const key in oldObj) {
//     if (ignoreFields.includes(key)) continue;
//     const oldValue = oldObj[key];
//     const newValue = newObj[key];

//     if (!deepEqual(oldValue, newValue)) {
//       difference[key] = newValue;
//     }
//   }

//   return Object.keys(difference).length === 0 ? null : difference;
// }

type DiffResult<T> = Partial<{
  [K in keyof T]: T[K] extends object ? DiffResult<T[K]> : T[K];
}>;

export function diff<T extends Record<string, any>>(obj1: T, obj2: T): DiffResult<T> {
  function findDifferences(o1: any, o2: any): any {
    if (Array.isArray(o1) && Array.isArray(o2)) {
      if (!arraysEqual(o1, o2)) {
        return o2;
      }
      return undefined;
    }

    if (typeof o1 === 'object' && typeof o2 === 'object' && o1 !== null && o2 !== null) {
      const diffResult: any = {};

      const keys = new Set([...Object.keys(o1), ...Object.keys(o2)]);
      keys.forEach(key => {
        const valueDiff = findDifferences(o1[key], o2[key]);
        if (valueDiff !== undefined) {
          diffResult[key] = valueDiff;
        }
      });

      return Object.keys(diffResult).length > 0 ? diffResult : undefined;
    }

    return o1 === o2 ? undefined : o2;
  }

  return findDifferences(obj1, obj2);
}
