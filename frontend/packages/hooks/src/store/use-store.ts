import { useSyncExternalStore } from 'react';

/**
 * 可订阅对象的接口约束
 *
 * 使用鸭子类型而非绑定 Store 类，任何满足此接口的对象都可以被 useStore 消费。
 */
export interface Subscribable<S> {
  /** 获取当前状态快照 */
  getSnapshot: () => S;

  /** 订阅状态变化，返回取消订阅函数 */
  subscribe: (listener: () => void) => () => void;
}

/**
 * 通用 Store 桥接 hook
 *
 * 职责：将 Store（class）连接到 React 渲染周期。 内部通过 `useSyncExternalStore` 实现，hook 本身不包含任何业务逻辑。
 *
 * @param store - 任何满足 Subscribable 接口的对象
 * @returns 当前状态快照
 */
export function useStore<S>(store: Subscribable<S>): S;

/**
 * 通用 Store 桥接 hook（带 selector）
 *
 * @param store - 任何满足 Subscribable 接口的对象
 * @param selector - 状态切片选择器（应返回原始值或稳定引用）
 * @returns Selector 返回的状态切片
 */
export function useStore<S, R>(store: Subscribable<S>, selector: (state: S) => R): R;

export function useStore<S, R = S>(store: Subscribable<S>, selector?: (state: S) => R): S | R {
  if (selector) {
    return useSyncExternalStore(store.subscribe, () => selector(store.getSnapshot()));
  }

  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
