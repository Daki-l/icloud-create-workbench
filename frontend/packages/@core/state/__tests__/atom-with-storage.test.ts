import { createStore } from 'jotai';
import { RESET } from 'jotai/utils';
import { describe, expect, it } from 'vitest';
import type { AtomStorage } from '../src/types';
import { createAtomWithStorage } from '../src/utils/atom-with-storage';
import { registerStorage } from '../src/utils/storage-registry';

function createMockStorage(initial?: Record<string, unknown>): AtomStorage {
  const store = new Map<string, unknown>(Object.entries(initial ?? {}));
  return {
    getItem: key => store.get(key) ?? null,
    removeItem: key => {
      store.delete(key);
    },
    setItem: (key, value) => {
      store.set(key, value);
    }
  };
}

describe('createAtomWithStorage', () => {
  it('无已有数据时返回初始值', () => {
    const mock = createMockStorage();
    registerStorage('aws-init', mock);

    const store = createStore();
    const testAtom = createAtomWithStorage('key1', 42, { storageName: 'aws-init' });
    expect(store.get(testAtom)).toBe(42);
  });

  it('从 storage 读取已有值', () => {
    const mock = createMockStorage({ 'persisted-key': 'saved-value' });
    registerStorage('aws-read', mock);

    const store = createStore();
    const testAtom = createAtomWithStorage('persisted-key', 'default', { storageName: 'aws-read' });
    expect(store.get(testAtom)).toBe('saved-value');
  });

  it('写入值同步到 storage', () => {
    const mock = createMockStorage();
    registerStorage('aws-write', mock);

    const store = createStore();
    const testAtom = createAtomWithStorage('write-key', 'initial', { storageName: 'aws-write' });

    store.set(testAtom, 'updated');
    expect(mock.getItem('write-key')).toBe('updated');
  });

  it('直传 storage 绕过 registry', () => {
    const directMock = createMockStorage({ 'direct-key': 99 });

    const store = createStore();
    const testAtom = createAtomWithStorage('direct-key', 0, { storage: directMock });
    expect(store.get(testAtom)).toBe(99);
  });

  it('未注册的 storageName 抛出错误', () => {
    expect(() => {
      createAtomWithStorage('key', 'val', { storageName: 'nonexistent-storage' });
    }).toThrowError('[core-state] Storage "nonexistent-storage" is not registered');
  });

  it('removeItem 从 storage 中删除键', () => {
    const mock = createMockStorage({ 'rm-key': 'to-delete' });
    registerStorage('aws-rm', mock);

    const store = createStore();
    const testAtom = createAtomWithStorage('rm-key', 'default', { storageName: 'aws-rm' });

    // jotai atomWithStorage uses RESET symbol to trigger removeItem
    store.set(testAtom, RESET as any);
    expect(mock.getItem('rm-key')).toBeNull();
  });

  it('storage 适配器返回 object 时直接使用，不做二次反序列化', () => {
    const objectMock: AtomStorage = {
      getItem: () => ({ deep: { nested: 'value' } }),
      removeItem: () => {},
      setItem: () => {}
    };
    registerStorage('aws-object', objectMock);

    const store = createStore();
    const testAtom = createAtomWithStorage<{ deep: { nested: string } }>(
      'obj-key',
      { deep: { nested: 'fallback' } },
      { storageName: 'aws-object' }
    );
    expect(store.get(testAtom)).toEqual({ deep: { nested: 'value' } });
  });

  it('storage.subscribe 接通：外部变更可推送到 atom', () => {
    let listener: ((value: unknown) => void) | undefined;
    const subMock: AtomStorage = {
      getItem: () => null,
      removeItem: () => {},
      setItem: () => {},
      subscribe: (_key, callback) => {
        listener = callback;
        return () => {
          listener = undefined;
        };
      }
    };
    registerStorage('aws-sub', subMock);

    const store = createStore();
    const testAtom = createAtomWithStorage('sub-key', 'init', { storageName: 'aws-sub' });

    const seen: string[] = [];
    const unsubscribe = store.sub(testAtom, () => {
      seen.push(store.get(testAtom));
    });

    expect(listener).toBeTypeOf('function');
    listener?.('externally-changed');
    expect(seen).toContain('externally-changed');

    unsubscribe();
  });

  it('无 storageName 时默认使用 local', () => {
    const mock = createMockStorage({ 'local-default-key': 'local-val' });
    registerStorage('local', mock);

    const store = createStore();
    const testAtom = createAtomWithStorage('local-default-key', 'fallback');
    expect(store.get(testAtom)).toBe('local-val');
  });

  it('storage.getItem 抛出异常时回退到初始值', () => {
    const throwMock: AtomStorage = {
      getItem: () => {
        throw new Error('corrupt data');
      },
      removeItem: () => {},
      setItem: () => {}
    };
    registerStorage('aws-throw', throwMock);

    const store = createStore();
    const testAtom = createAtomWithStorage('throw-key', 'fallback', { storageName: 'aws-throw' });
    expect(store.get(testAtom)).toBe('fallback');
  });

  it('storage.subscribe 收到 null 时回退到 initialValue', () => {
    let listener: ((value: unknown) => void) | undefined;
    const subMock: AtomStorage = {
      getItem: () => 'stored',
      removeItem: () => {},
      setItem: () => {},
      subscribe: (_key, callback) => {
        listener = callback;
        return () => {};
      }
    };
    registerStorage('aws-sub-null', subMock);

    const store = createStore();
    const testAtom = createAtomWithStorage('sub-null-key', 'fallback', { storageName: 'aws-sub-null' });

    const seen: string[] = [];
    store.sub(testAtom, () => {
      seen.push(store.get(testAtom));
    });

    listener?.(null);
    expect(seen).toContain('fallback');
  });
});
