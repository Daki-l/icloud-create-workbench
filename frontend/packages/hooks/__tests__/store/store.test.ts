import { Store } from '../../src/store/store';

/**
 * 用于测试的 Store 子类
 *
 * Store 的 setState / patchState 是 protected， 暴露出来才能在测试中直接调用。
 */
class TestStore<S> extends Store<S> {
  set(nextOrUpdater: S | ((prev: S) => S)) {
    this.setState(nextOrUpdater);
  }

  patch(partial: Partial<S> | ((prev: S) => Partial<S>)) {
    this.patchState(partial);
  }
}

// ─── 基础状态管理 ──────────────────────────────────────

describe('Store - 基础状态管理', () => {
  it('初始化后 getSnapshot 应返回初始值', () => {
    const store = new TestStore(0);
    expect(store.getSnapshot()).toBe(0);
  });

  it('setState 直接传值应更新状态', () => {
    const store = new TestStore(0);
    store.set(42);
    expect(store.getSnapshot()).toBe(42);
  });

  it('setState updater 函数应基于前一个状态更新', () => {
    const store = new TestStore(10);
    store.set(prev => prev + 5);
    expect(store.getSnapshot()).toBe(15);
  });

  it('setState 相同值（Object.is）应跳过更新', () => {
    const store = new TestStore(1);
    const listener = vi.fn();
    store.subscribe(listener);

    store.set(1); // 同一个值
    expect(listener).not.toHaveBeenCalled();
  });

  it('setState 对象引用不同但值相同时应触发更新', () => {
    const obj = { a: 1 };
    const store = new TestStore(obj);
    const listener = vi.fn();
    store.subscribe(listener);

    store.set({ a: 1 }); // 新对象，Object.is 不等
    expect(listener).toHaveBeenCalledOnce();
  });
});

// ─── patchState 局部更新 ────────────────────────────────

describe('Store - patchState 局部更新', () => {
  interface UserState {
    age: number;
    name: string;
  }

  it('patchState 应只合并传入的字段', () => {
    const store = new TestStore<UserState>({ name: 'Alice', age: 20 });
    store.patch({ age: 21 });
    expect(store.getSnapshot()).toEqual({ name: 'Alice', age: 21 });
  });

  it('patchState updater 函数应基于前一个状态合并', () => {
    const store = new TestStore<UserState>({ name: 'Alice', age: 20 });
    store.patch(prev => ({ age: prev.age + 1 }));
    expect(store.getSnapshot()).toEqual({ name: 'Alice', age: 21 });
  });

  it('patchState 空对象应触发更新（产生新引用）', () => {
    const store = new TestStore<UserState>({ name: 'Alice', age: 20 });
    const listener = vi.fn();
    store.subscribe(listener);

    store.patch({});
    // 因为 { ...state, ...{} } 产生了新对象，Object.is 不等
    expect(listener).toHaveBeenCalledOnce();
  });
});

// ─── 订阅 / 通知机制 ────────────────────────────────────

describe('Store - 订阅 / 通知机制', () => {
  it('subscribe 应在状态变化时通知订阅者', () => {
    const store = new TestStore(0);
    const listener = vi.fn();
    store.subscribe(listener);

    store.set(1);
    expect(listener).toHaveBeenCalledOnce();
  });

  it('多个订阅者应同时收到通知', () => {
    const store = new TestStore(0);
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    store.subscribe(listener1);
    store.subscribe(listener2);

    store.set(1);
    expect(listener1).toHaveBeenCalledOnce();
    expect(listener2).toHaveBeenCalledOnce();
  });

  it('取消订阅后不应再收到通知', () => {
    const store = new TestStore(0);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.set(1);
    expect(listener).toHaveBeenCalledOnce();

    unsubscribe();
    store.set(2);
    expect(listener).toHaveBeenCalledOnce(); // 仍然是 1 次
  });

  it('同一个 listener 重复订阅只通知一次（Set 去重）', () => {
    const store = new TestStore(0);
    const listener = vi.fn();
    store.subscribe(listener);
    store.subscribe(listener);

    store.set(1);
    expect(listener).toHaveBeenCalledOnce();
  });

  it('状态未变化时不应通知订阅者', () => {
    const store = new TestStore('hello');
    const listener = vi.fn();
    store.subscribe(listener);

    store.set('hello');
    expect(listener).not.toHaveBeenCalled();
  });
});

// ─── 连续操作 ────────────────────────────────────────

describe('Store - 连续操作', () => {
  it('连续 setState 应依次更新', () => {
    const store = new TestStore(0);
    store.set(1);
    store.set(2);
    store.set(3);
    expect(store.getSnapshot()).toBe(3);
  });

  it('连续 setState updater 应链式计算', () => {
    const store = new TestStore(0);
    store.set(prev => prev + 1);
    store.set(prev => prev * 2);
    store.set(prev => prev + 3);
    expect(store.getSnapshot()).toBe(5); // (0+1)*2+3 = 5
  });
});
