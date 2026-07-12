// oxlint-disable no-continue
// oxlint-disable max-params
import type { NamePath, SetOptions } from './path-utils';
import { emptyContainer, isObjectLike, isPlainObject, isUnsafeKey, toSegments } from './path-utils';

/** Immutable deep set. Creates intermediate containers as needed and never mutates the original object. */
export function deepSet<T, V>(obj: T, path: NamePath, value: V, options: SetOptions = { safeKeys: true }): T {
  const segs = toSegments(path);

  if (segs.length === 0) return obj;

  const { safeKeys = true } = options;

  function setImpl(node: unknown, index: number): unknown {
    const key = segs[index];

    if (safeKeys && isUnsafeKey(key)) {
      return node;
    }

    const isLast = index === segs.length - 1;

    let base: any;

    if (Array.isArray(node)) {
      base = node.slice();
    } else if (isPlainObject(node)) {
      base = { ...node };
    } else {
      base = emptyContainer(key);
    }

    if (isLast) {
      if (Array.isArray(base)) {
        base[key as number] = value;
      } else {
        base[key as any] = value;
      }

      return base;
    }

    const nextChild = isObjectLike(node) ? node[key] : undefined;
    const written = setImpl(nextChild, index + 1);

    if (Array.isArray(base)) {
      base[key as number] = written;
    } else {
      base[key as any] = written;
    }

    return base;
  }

  return setImpl(obj, 0) as T;
}

export function deepUnset<T>(obj: T, path: NamePath, options: SetOptions = { safeKeys: true }): T {
  const segs = toSegments(path);

  if (segs.length === 0) return obj;

  const { safeKeys = true } = options;

  function unsetImpl(node: unknown, index: number): unknown {
    const key = segs[index];

    if (safeKeys && isUnsafeKey(key)) return node;

    const isLast = index === segs.length - 1;

    if (Array.isArray(node)) {
      const arr = node.slice();

      if (isLast) {
        arr.splice(key as number, 1);
        return arr;
      }

      arr[key as number] = unsetImpl(arr[key as number], index + 1);
      return arr;
    }

    if (isPlainObject(node)) {
      const out: Record<string, unknown> = {};

      for (const keyInNode of Object.keys(node)) {
        if (isLast && keyInNode === key) {
          continue;
        }

        out[keyInNode] = keyInNode === key ? unsetImpl(node[keyInNode], index + 1) : node[keyInNode];
      }

      return out;
    }

    return node;
  }

  return unsetImpl(obj, 0) as T;
}

export const unflatten = <T extends Record<string, any>>(obj: T): T => {
  if (!obj) return {} as T;

  let acc: Record<string, any> = {};

  for (const [path, value] of Object.entries(obj)) {
    acc = deepSet(acc, path, value);
  }

  return acc as T;
};
