import { atom } from 'jotai';
import { describe, expect, it } from 'vitest';
import { getAtomValue, setAtomValue, updateAtomValue } from '../src/store/global';

describe('global store', () => {
  it('getAtomValue 读取 atom 初始值', () => {
    const countAtom = atom(0);
    expect(getAtomValue(countAtom)).toBe(0);
  });

  it('setAtomValue 设置 atom 值', () => {
    const countAtom = atom(0);
    setAtomValue(countAtom, 10);
    expect(getAtomValue(countAtom)).toBe(10);
  });

  it('setAtomValue 支持 primitive atom 函数式更新', () => {
    const countAtom = atom(1);
    setAtomValue(countAtom, prev => prev + 1);
    expect(getAtomValue(countAtom)).toBe(2);
  });

  it('updateAtomValue 基于旧值更新', () => {
    const countAtom = atom(5);
    updateAtomValue(countAtom, prev => prev * 2);
    expect(getAtomValue(countAtom)).toBe(10);
  });

  it('updateAtomValue 连续调用累积', () => {
    const countAtom = atom(1);
    updateAtomValue(countAtom, prev => prev + 1);
    updateAtomValue(countAtom, prev => prev + 1);
    updateAtomValue(countAtom, prev => prev + 1);
    expect(getAtomValue(countAtom)).toBe(4);
  });
});
