/* eslint-disable max-params */

export type Key = string | number;
export type PathTuple = readonly Key[];
export type NamePath = Key | PathTuple | undefined;

export type SetOptions = {
  /** Reject dangerous keys like "**proto**", "constructor", "prototype". Default: true (recommended) */
  safeKeys?: boolean;
};

export const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;

export const isObjectRecord = (value: unknown): value is Record<Key, unknown> =>
  value !== null && typeof value === 'object';

export const isObjectLike = (value: unknown): value is Record<string | number, unknown> =>
  value !== null && typeof value === 'object';

export const isUnsafeKey = (key: Key) => key === '__proto__' || key === 'constructor' || key === 'prototype';

const PATH_RX = /[^.[\]]+|\[(?:([^"'[\]]+)|"([^"]*)"|'([^']*)')\]/g;

export function toPathArray(path: string): Key[] {
  const out: Key[] = [];

  path.replace(PATH_RX, (match: string, a?: string, b?: string, c?: string) => {
    const seg = (a || b || c || match) as string;

    out.push(/^(0|[1-9]\d*)$/.test(seg) ? Number(seg) : seg);
    return '';
  });

  return out;
}

export function toSegments(path: NamePath): Key[] {
  if (Array.isArray(path)) return [...path];

  if (typeof path === 'string') return toPathArray(path);

  return [path as Key];
}

export const keyOfTuple = (tuple: PathTuple) => tuple.join('.');

export const keyOfName = (name: NamePath) => keyOfTuple(toSegments(name));

export function emptyContainer(nextKey: Key): any {
  return typeof nextKey === 'number' ? [] : {};
}

export const flagOn = (set: Set<string>, name: NamePath) => {
  set.add(keyOfName(name));
};

export const flagOff = (set: Set<string>, name: NamePath) => {
  set.delete(keyOfName(name));
};

export const isOn = (set: Set<string>, name: NamePath) => set.has(keyOfName(name));

export const anyOn = (set: Set<string>, names?: NamePath[]) =>
  !names || names.length === 0 ? set.size > 0 : names.some(name => set.has(keyOfName(name)));

export const allOn = (set: Set<string>, names?: NamePath[]) =>
  !names || names.length === 0 ? set.size > 0 : names.every(name => set.has(keyOfName(name)));

export const collectChangedLeafPaths = (
  input: any,
  prefix: (string | number)[] = [],
  out: (string | number)[][] = []
) => {
  if (Array.isArray(input)) {
    out.push([...prefix]);
    input.forEach((item, index) => collectChangedLeafPaths(item, [...prefix, keyOfName(index)], out));
  } else if (input && typeof input === 'object') {
    Object.keys(input).forEach(key => {
      collectChangedLeafPaths(input[keyOfName(key)], [...prefix, keyOfName(key)], out);
    });
  } else {
    out.push([...prefix]);
  }

  return out;
};

export const unionPaths = (a: (string | number)[][], b: (string | number)[][]) => {
  const set = new Set<string>();
  const res: (string | number)[][] = [];

  function add(path: (string | number)[]) {
    const key = path.join('.');

    if (!set.has(key)) {
      set.add(key);
      res.push(path);
    }
  }

  a.forEach(add);
  b.forEach(add);

  return res;
};

export const microtask =
  typeof queueMicrotask === 'function' ? queueMicrotask : (cb: () => void) => Promise.resolve().then(cb);

export const isUnderPrefix = (key: string, prefix: string): boolean => {
  if (prefix === '' || prefix === '*') return true;

  if (key === prefix) return true;

  return key.length > prefix.length && key.startsWith(prefix) && key[prefix.length] === '.';
};

export function collectDeepKeys(obj: any, prefix: string = ''): string[] {
  if (obj === null || obj === undefined) {
    return [prefix];
  }

  if (typeof obj !== 'object' || obj instanceof Date) {
    return [prefix];
  }

  const keys: string[] = [];

  if (Object.keys(obj).length === 0) {
    keys.push(prefix);
    return keys;
  }

  for (const key of Object.keys(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;

    keys.push(...collectDeepKeys(obj[key], path));
  }

  return keys;
}
