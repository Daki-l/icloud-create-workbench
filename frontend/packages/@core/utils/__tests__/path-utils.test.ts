import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  allOn,
  anyOn,
  collectChangedLeafPaths,
  collectDeepKeys,
  emptyContainer,
  flagOff,
  flagOn,
  isObjectLike,
  isObjectRecord,
  isOn,
  isPlainObject,
  isUnderPrefix,
  isUnsafeKey,
  keyOfName,
  keyOfTuple,
  toPathArray,
  toSegments,
  unionPaths
} from '../src/path-utils';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('path parsing', () => {
  it('parses dot paths, numeric brackets, and quoted brackets', () => {
    expect(toPathArray('user.addresses[0].city')).toEqual(['user', 'addresses', 0, 'city']);
    expect(toPathArray('items["sku.code"]')).toEqual(['items', 'sku.code']);
    expect(toPathArray("items['sku.code']")).toEqual(['items', 'sku.code']);
    expect(toPathArray('items[01]')).toEqual(['items', '01']);
  });

  it('normalizes supported name path inputs into segments', () => {
    const tuple = ['user', 0] as const;

    expect(toSegments(tuple)).toEqual(['user', 0]);
    expect(toSegments(tuple)).not.toBe(tuple);
    expect(toSegments('user[0]')).toEqual(['user', 0]);
    expect(toSegments(0)).toEqual([0]);
    expect(toSegments(undefined)).toEqual([undefined]);
  });

  it('creates string keys from tuple and name paths', () => {
    expect(keyOfTuple(['user', 'name'])).toBe('user.name');
    expect(keyOfName('user.name')).toBe('user.name');
    expect(keyOfName(['user', 'name'])).toBe('user.name');
    expect(keyOfName(undefined)).toBe('');
  });
});

describe('path guards and containers', () => {
  it('checks object shapes', () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject([])).toBe(false);
    expect(isObjectRecord([])).toBe(true);
    expect(isObjectLike({})).toBe(true);
    expect(isObjectLike(null)).toBe(false);
  });

  it('checks unsafe object keys', () => {
    expect(isUnsafeKey('__proto__')).toBe(true);
    expect(isUnsafeKey('constructor')).toBe(true);
    expect(isUnsafeKey('prototype')).toBe(true);
    expect(isUnsafeKey('safe')).toBe(false);
  });

  it('creates containers from path segment intent', () => {
    expect(emptyContainer(0)).toEqual([]);
    expect(emptyContainer('profile')).toEqual({});
  });
});

describe('path flags', () => {
  it('sets, reads, and clears flags by normalized name path', () => {
    const flags = new Set<string>();

    flagOn(flags, ['profile', 'name']);

    expect(isOn(flags, 'profile.name')).toBe(true);
    expect(anyOn(flags, [['profile', 'name']])).toBe(true);
    expect(allOn(flags, [['profile', 'name']])).toBe(true);

    flagOff(flags, 'profile.name');

    expect(isOn(flags, ['profile', 'name'])).toBe(false);
  });

  it('handles empty name lists by checking set size', () => {
    const flags = new Set<string>();

    expect(anyOn(flags)).toBe(false);
    expect(allOn(flags)).toBe(false);

    flags.add('profile.name');

    expect(anyOn(flags)).toBe(true);
    expect(allOn(flags)).toBe(true);
  });
});

describe('path collection', () => {
  it('collects changed leaf paths including array nodes', () => {
    expect(collectChangedLeafPaths({ items: [{ title: 'First' }], profile: { name: 'Alex' } })).toEqual([
      ['items'],
      ['items', '0', 'title'],
      ['profile', 'name']
    ]);
  });

  it('unions path lists while preserving first occurrence order', () => {
    expect(
      unionPaths(
        [
          ['profile', 'name'],
          ['items', 0]
        ],
        [
          ['items', 0],
          ['profile', 'age']
        ]
      )
    ).toEqual([
      ['profile', 'name'],
      ['items', 0],
      ['profile', 'age']
    ]);
  });

  it('checks prefix containment for exact, wildcard, and nested paths', () => {
    expect(isUnderPrefix('profile.name', 'profile')).toBe(true);
    expect(isUnderPrefix('profile', 'profile')).toBe(true);
    expect(isUnderPrefix('profileName', 'profile')).toBe(false);
    expect(isUnderPrefix('profile.name', '*')).toBe(true);
    expect(isUnderPrefix('profile.name', '')).toBe(true);
  });

  it('collects deep keys from nested values', () => {
    const date = new Date('2026-05-07T00:00:00.000Z');

    expect(collectDeepKeys({ empty: {}, list: [1], nil: null, profile: { birthday: date, name: 'Alex' } })).toEqual([
      'empty',
      'list.0',
      'nil',
      'profile.birthday',
      'profile.name'
    ]);
  });
});

describe('microtask', () => {
  it('falls back to a resolved promise when queueMicrotask is unavailable', async () => {
    vi.stubGlobal('queueMicrotask', undefined);
    vi.resetModules();

    const { microtask } = await import('../src/path-utils');
    const calls: string[] = [];

    microtask(() => {
      calls.push('flushed');
    });

    expect(calls).toEqual([]);

    await Promise.resolve();

    expect(calls).toEqual(['flushed']);

    vi.resetModules();
  });
});
