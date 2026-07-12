import { useCreation } from 'ahooks';
import { Store, useStore } from './store';

/**
 * 数组状态引擎
 *
 * 所有数组操作逻辑集中在 class 中， 外部通过 useArray hook 桥接 React 渲染。
 */
class ArrayStore<T, K extends keyof T> extends Store<T[]> {
  /** 初始状态（用于 reset） */
  private readonly initialState: T[];

  /** 用于唯一标识元素的 key 字段 */
  private readonly resolvedKey: K;

  constructor(initState: T[], key?: K) {
    super(initState);
    this.initialState = initState;
    this.resolvedKey = (key ?? 'id') as K;
  }

  /** 直接更新状态 */
  updateState = (newState: T[] | ((prevState: T[]) => T[])) => {
    if (typeof newState === 'function') {
      this.setState(prev => (newState as (prevState: T[]) => T[])(prev));
    } else {
      this.setState(newState);
    }
  };

  /** 尾部追加（按 key 去重） */
  push = (...newItems: T[]) => {
    this.setState(prev => {
      const merged = [...prev, ...newItems];
      return merged.filter(
        (item, index, self) => index === self.findIndex(t => t[this.resolvedKey] === item[this.resolvedKey])
      );
    });
  };

  /** 头部追加（按 key 去重） */
  unshift = (...newItems: T[]) => {
    this.setState(prev => {
      const merged = [...newItems, ...prev];
      return merged.filter(
        (item, index, self) => index === self.findIndex(t => t[this.resolvedKey] === item[this.resolvedKey])
      );
    });
  };

  /** 按 key 移除元素 */
  remove = (itemKey: T[K]) => {
    this.setState(prev => prev.filter(i => i[this.resolvedKey] !== itemKey));
  };

  /** 上移元素 */
  up = (itemKey: T[K]) => {
    this.setState(prev => {
      const index = prev.findIndex(i => i[this.resolvedKey] === itemKey);

      if (index <= 0) return prev;

      const next = [...prev];
      [next[index], next[index - 1]] = [next[index - 1], next[index]];

      return next;
    });
  };

  /** 下移元素 */
  down = (itemKey: T[K]) => {
    this.setState(prev => {
      const index = prev.findIndex(i => i[this.resolvedKey] === itemKey);

      if (index === prev.length - 1 || index === -1) return prev;

      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];

      return next;
    });
  };

  /** 移除末尾元素 */
  pop = () => {
    this.setState(prev => prev.slice(0, -1));
  };

  /** 移除首部元素 */
  shift = () => {
    this.setState(prev => prev.slice(1));
  };

  /** 反转数组 */
  reverse = () => {
    this.setState(prev => [...prev].toReversed());
  };

  /** 排序数组 */
  sort = (compareFn?: (a: T, b: T) => number) => {
    this.setState(prev => [...prev].toSorted(compareFn));
  };

  /** 拼接数组 */
  splice = (start: number, deleteCount?: number, ...items: T[]) => {
    const end = deleteCount ?? 0;
    this.setState(prev => {
      const next = [...prev];
      next.splice(start, end, ...items);
      return next;
    });
  };

  /** 清空数组 */
  clear = () => {
    this.setState([]);
  };

  /** 重置为初始状态 */
  reset = () => {
    this.setState(this.initialState);
  };

  /** 按 key 查找元素（直接读取 class 内部状态，不依赖 React 渲染周期） */
  findItem = (elementKey: T[K]) => {
    return this.state.find(item => item[this.resolvedKey] === elementKey);
  };
}

/**
 * 数组状态管理 hook
 *
 * Class 管逻辑（ArrayStore），Hook 管渲染（useStore）。
 *
 * @param initState - 初始数组
 * @param key - 用于唯一标识元素的字段名，默认 'id'
 * @returns [当前状态, store 实例]
 */
export default function useArray<T, K extends keyof T>(initState: T[], key?: K): [T[], ArrayStore<T, K>] {
  const store = useCreation(() => new ArrayStore(initState, key), []);

  const state = useStore(store);

  return [state, store];
}
