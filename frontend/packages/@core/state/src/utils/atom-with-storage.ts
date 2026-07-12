import { atomWithStorage as jotaiAtomWithStorage } from 'jotai/utils';
import type { AtomStorage } from '../types';
import { getStorage } from './storage-registry';

export interface CreateAtomWithStorageOptions {
  /**
   * Whether to read storage synchronously during atom creation.
   *
   * Set to `false` if SSR hydration mismatch is a concern.
   *
   * @default true
   */
  getOnInit?: boolean;
  /** Direct storage adapter — bypasses registry when provided. */
  storage?: AtomStorage;
  /**
   * Registry name to resolve storage from.
   *
   * Ignored when `storage` is provided.
   *
   * @default 'local'
   */
  storageName?: string;
}

/**
 * Create a persistent atom backed by a registered (or directly provided) storage adapter.
 *
 * Serialization is the adapter's responsibility — the wrapper assumes `storage.getItem` already returns the
 * deserialized value (or `null` / `undefined` when the key is absent). This avoids the foot-gun of feeding an
 * already-parsed object back through `JSON.parse`.
 *
 * If the adapter throws while reading (e.g. corrupt data), the atom transparently falls back to `initialValue` instead
 * of bringing down the module.
 *
 * @example
 *   ```ts
 *   // Uses registered 'local' storage (default)
 *   const themeAtom = createAtomWithStorage('theme', { mode: 'light' });
 *
 *   // Uses registered 'session' storage
 *   const tabAtom = createAtomWithStorage('tab', 'home', { storageName: 'session' });
 *
 *   // Bypass registry with a direct storage adapter
 *   const customAtom = createAtomWithStorage('key', val, { storage: myAdapter });
 *   ```
 */
export function createAtomWithStorage<T>(key: string, initialValue: T, options?: CreateAtomWithStorageOptions) {
  const storageImpl = options?.storage ?? getStorage(options?.storageName ?? 'local');
  const getOnInit = options?.getOnInit ?? true;

  const adapter: {
    getItem: (key: string, initialValue: T) => T;
    removeItem: (key: string) => void;
    setItem: (key: string, value: T) => void;
    subscribe?: (key: string, callback: (value: T) => void, initialValue: T) => () => void;
  } = {
    getItem: (keyToGet, initialValueToGet) => {
      try {
        const value = storageImpl.getItem(keyToGet);
        return value === null || value === undefined ? initialValueToGet : (value as T);
      } catch {
        return initialValueToGet;
      }
    },
    removeItem: keyToRemove => storageImpl.removeItem(keyToRemove),
    setItem: (keyToSet, value) => storageImpl.setItem(keyToSet, value)
  };

  if (storageImpl.subscribe) {
    const subscribe = storageImpl.subscribe;
    adapter.subscribe = (keyToSubscribe, callback, initialValueToSubscribe) =>
      subscribe(
        keyToSubscribe,
        next => callback(next === null || next === undefined ? initialValueToSubscribe : (next as T)),
        initialValueToSubscribe
      );
  }

  return jotaiAtomWithStorage<T>(key, initialValue, adapter, { getOnInit });
}
