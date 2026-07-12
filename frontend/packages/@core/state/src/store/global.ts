import { createStore } from 'jotai';
import type { Atom, PrimitiveAtom, WritableAtom } from 'jotai';
import type { SetStateAction } from 'jotai/vanilla';

/**
 * Global Jotai store.
 *
 * Use cases:
 *
 * 1. Access / modify atoms outside React (axios interceptors, event handlers, etc.)
 * 2. Server-side rendering (SSR)
 * 3. Test environments
 *
 * @see https://jotai.org/docs/core/store
 */
export const globalStore = createStore();

/** Read an atom value outside React. */
export function getAtomValue<Value>(atom: Atom<Value>): Value {
  return globalStore.get(atom);
}

/**
 * Write to an atom outside React.
 *
 * Generic over the atom's write arguments so it works with any `WritableAtom`, including ones whose write signature
 * differs from their read type (e.g. `atomWithPartial`, derived writers).
 */
export function setAtomValue<Value>(atom: PrimitiveAtom<Value>, value: SetStateAction<Value>): void;
export function setAtomValue<Value, Args extends unknown[], Result>(
  atom: WritableAtom<Value, Args, Result>,
  ...args: Args
): Result;
export function setAtomValue<Value, Args extends unknown[], Result>(
  atom: WritableAtom<Value, Args, Result>,
  ...args: Args
): Result {
  return globalStore.set(atom, ...args);
}

/**
 * Functionally update an atom outside React.
 *
 * Constrained to atoms whose write signature is `(next: Value) => unknown` — the common "primitive-like" case. For
 * atoms with a custom write signature (e.g. `atomWithPartial`), call {@link setAtomValue} directly.
 */
export function updateAtomValue<Value, Result = unknown>(
  atom: WritableAtom<Value, [SetStateAction<Value>], Result>,
  updater: (prev: Value) => Value
): Result {
  const currentValue = globalStore.get(atom);
  return globalStore.set(atom, updater(currentValue));
}
