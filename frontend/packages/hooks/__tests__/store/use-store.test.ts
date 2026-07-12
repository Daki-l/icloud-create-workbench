import { act, renderHook } from '@testing-library/react';
import { Store } from '../../src/store/store';
import { useStore } from '../../src/store/use-store';
import type { Subscribable } from '../../src/store/use-store';

/** 测试用 Store 子类，暴露 setState */
class CounterStore extends Store<number> {
  increment = () => {
    this.setState(prev => prev + 1);
  };

  set = (value: number) => {
    this.setState(value);
  };
}

/** 测试用对象状态 Store */
class ProfileStore extends Store<{ age: number; name: string }> {
  setName = (name: string) => {
    this.patchState({ name });
  };

  setAge = (age: number) => {
    this.patchState({ age });
  };
}

// ─── 基础桥接 ────────────────────────────────────────

describe('useStore - 基础桥接', () => {
  it('应返回 Store 的当前状态', () => {
    const store = new CounterStore(0);
    const { result } = renderHook(() => useStore(store));

    expect(result.current).toBe(0);
  });

  it('Store 状态变化应触发 React 重渲染', () => {
    const store = new CounterStore(0);
    const { result } = renderHook(() => useStore(store));

    act(() => {
      store.increment();
    });

    expect(result.current).toBe(1);
  });

  it('连续更新应反映最终状态', () => {
    const store = new CounterStore(0);
    const { result } = renderHook(() => useStore(store));

    act(() => {
      store.increment();
      store.increment();
      store.increment();
    });

    expect(result.current).toBe(3);
  });
});

// ─── selector 模式 ────────────────────────────────────

describe('useStore - selector', () => {
  it('selector 应提取状态切片', () => {
    const store = new ProfileStore({ name: 'Alice', age: 20 });
    const { result } = renderHook(() => useStore(store, s => s.name));

    expect(result.current).toBe('Alice');
  });

  it('selector 切片变化应触发重渲染', () => {
    const store = new ProfileStore({ name: 'Alice', age: 20 });
    const { result } = renderHook(() => useStore(store, s => s.name));

    act(() => {
      store.setName('Bob');
    });

    expect(result.current).toBe('Bob');
  });

  it('其他字段变化时 selector 返回值不变也会经过 useSyncExternalStore 处理', () => {
    const store = new ProfileStore({ name: 'Alice', age: 20 });
    const { result } = renderHook(() => useStore(store, s => s.name));

    act(() => {
      store.setAge(21); // name 没变
    });

    // useSyncExternalStore 内部做了比较，name 没变不会导致问题
    expect(result.current).toBe('Alice');
  });
});

// ─── 鸭子类型兼容性 ────────────────────────────────────

describe('useStore - 鸭子类型（Subscribable 接口）', () => {
  it('任何实现 Subscribable 接口的对象都应可用', () => {
    // 手写一个最简单的 Subscribable
    const listeners = new Set<() => void>();
    let value = 'initial';

    const customStore: Subscribable<string> = {
      getSnapshot: () => value,
      subscribe: (listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      }
    };

    const { result } = renderHook(() => useStore(customStore));
    expect(result.current).toBe('initial');

    act(() => {
      value = 'updated';
      listeners.forEach(l => l());
    });

    expect(result.current).toBe('updated');
  });
});
