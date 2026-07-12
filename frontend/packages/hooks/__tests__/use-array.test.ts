import { act, renderHook } from '@testing-library/react';
import useArray from '../src/use-array';

interface Item {
  id: number;
  name: string;
}

const initial: Item[] = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 3, name: 'Charlie' }
];

// ─── Hook 桥接层：状态变化应触发 React 重渲染 ──────────────

describe('useArray - hook 桥接层', () => {
  it('初始化应返回初始数组和 store 实例', () => {
    const { result } = renderHook(() => useArray(initial, 'id'));
    const [state, store] = result.current;

    expect(state).toEqual(initial);
    expect(store).toBeDefined();
    expect(typeof store.push).toBe('function');
    expect(typeof store.remove).toBe('function');
  });

  it('store 实例在重渲染之间应保持稳定', () => {
    const { rerender, result } = renderHook(() => useArray(initial, 'id'));
    const storeRef = result.current[1];

    rerender();
    expect(result.current[1]).toBe(storeRef);
  });
});

// ─── push（尾部追加 + 去重） ───────────────────────────

describe('useArray - push', () => {
  it('应在尾部追加新元素', () => {
    const { result } = renderHook(() => useArray(initial, 'id'));

    act(() => {
      result.current[1].push({ id: 4, name: 'Dave' });
    });

    expect(result.current[0]).toHaveLength(4);
    expect(result.current[0][3]).toEqual({ id: 4, name: 'Dave' });
  });

  it('应按 key 去重（保留先出现的）', () => {
    const { result } = renderHook(() => useArray(initial, 'id'));

    act(() => {
      result.current[1].push({ id: 1, name: 'Alice-dup' });
    });

    expect(result.current[0]).toHaveLength(3);
    expect(result.current[0][0]!.name).toBe('Alice'); // 保留原来的
  });

  it('应支持一次 push 多个元素', () => {
    const { result } = renderHook(() => useArray(initial, 'id'));

    act(() => {
      result.current[1].push({ id: 4, name: 'Dave' }, { id: 5, name: 'Eve' });
    });

    expect(result.current[0]).toHaveLength(5);
  });
});

// ─── unshift（头部追加 + 去重） ────────────────────────

describe('useArray - unshift', () => {
  it('应在头部追加新元素', () => {
    const { result } = renderHook(() => useArray(initial, 'id'));

    act(() => {
      result.current[1].unshift({ id: 0, name: 'Zero' });
    });

    expect(result.current[0]).toHaveLength(4);
    expect(result.current[0][0]).toEqual({ id: 0, name: 'Zero' });
  });

  it('应按 key 去重（保留先出现的，即新添加的）', () => {
    const { result } = renderHook(() => useArray(initial, 'id'));

    act(() => {
      result.current[1].unshift({ id: 1, name: 'Alice-new' });
    });

    expect(result.current[0]).toHaveLength(3);
    expect(result.current[0][0]!.name).toBe('Alice-new'); // 新的在前
  });
});

// ─── remove（按 key 移除） ────────────────────────────

describe('useArray - remove', () => {
  it('应按 key 移除元素', () => {
    const { result } = renderHook(() => useArray(initial, 'id'));

    act(() => {
      result.current[1].remove(2);
    });

    expect(result.current[0]).toHaveLength(2);
    expect(result.current[0].find(i => i.id === 2)).toBeUndefined();
  });

  it('移除不存在的 key 应保持不变', () => {
    const { result } = renderHook(() => useArray(initial, 'id'));

    act(() => {
      result.current[1].remove(999);
    });

    expect(result.current[0]).toHaveLength(3);
  });
});

// ─── up / down（移动元素） ──────────────────────────────

describe('useArray - up / down', () => {
  it('up 应将元素上移一位', () => {
    const { result } = renderHook(() => useArray(initial, 'id'));

    act(() => {
      result.current[1].up(2); // Bob 上移
    });

    expect(result.current[0][0]!.name).toBe('Bob');
    expect(result.current[0][1]!.name).toBe('Alice');
  });

  it('up 首元素不应变化', () => {
    const { result } = renderHook(() => useArray(initial, 'id'));

    act(() => {
      result.current[1].up(1); // Alice 已经是第一个
    });

    expect(result.current[0]).toEqual(initial);
  });

  it('down 应将元素下移一位', () => {
    const { result } = renderHook(() => useArray(initial, 'id'));

    act(() => {
      result.current[1].down(2); // Bob 下移
    });

    expect(result.current[0][1]!.name).toBe('Charlie');
    expect(result.current[0][2]!.name).toBe('Bob');
  });

  it('down 末尾元素不应变化', () => {
    const { result } = renderHook(() => useArray(initial, 'id'));

    act(() => {
      result.current[1].down(3); // Charlie 已经是最后一个
    });

    expect(result.current[0]).toEqual(initial);
  });

  it('up/down 不存在的 key 不应变化', () => {
    const { result } = renderHook(() => useArray(initial, 'id'));

    act(() => {
      result.current[1].up(999);
    });
    expect(result.current[0]).toEqual(initial);

    act(() => {
      result.current[1].down(999);
    });
    expect(result.current[0]).toEqual(initial);
  });
});

// ─── pop / shift ─────────────────────────────────────

describe('useArray - pop / shift', () => {
  it('pop 应移除末尾元素', () => {
    const { result } = renderHook(() => useArray(initial, 'id'));

    act(() => {
      result.current[1].pop();
    });

    expect(result.current[0]).toHaveLength(2);
    expect(result.current[0][1]!.name).toBe('Bob');
  });

  it('shift 应移除首部元素', () => {
    const { result } = renderHook(() => useArray(initial, 'id'));

    act(() => {
      result.current[1].shift();
    });

    expect(result.current[0]).toHaveLength(2);
    expect(result.current[0][0]!.name).toBe('Bob');
  });
});

// ─── reverse / sort ──────────────────────────────────

describe('useArray - reverse / sort', () => {
  it('reverse 应反转数组', () => {
    const { result } = renderHook(() => useArray(initial, 'id'));

    act(() => {
      result.current[1].reverse();
    });

    expect(result.current[0].map(i => i.id)).toEqual([3, 2, 1]);
  });

  it('sort 应按 compareFn 排序', () => {
    const { result } = renderHook(() =>
      useArray(
        [
          { id: 3, name: 'C' },
          { id: 1, name: 'A' },
          { id: 2, name: 'B' }
        ],
        'id'
      )
    );

    act(() => {
      result.current[1].sort((a, b) => a.id - b.id);
    });

    expect(result.current[0].map(i => i.id)).toEqual([1, 2, 3]);
  });
});

// ─── splice ──────────────────────────────────────────

describe('useArray - splice', () => {
  it('应在指定位置插入元素', () => {
    const { result } = renderHook(() => useArray(initial, 'id'));

    act(() => {
      result.current[1].splice(1, 0, { id: 10, name: 'Inserted' });
    });

    expect(result.current[0]).toHaveLength(4);
    expect(result.current[0][1]!.name).toBe('Inserted');
  });

  it('应删除指定数量的元素', () => {
    const { result } = renderHook(() => useArray(initial, 'id'));

    act(() => {
      result.current[1].splice(1, 1);
    });

    expect(result.current[0]).toHaveLength(2);
    expect(result.current[0].find(i => i.name === 'Bob')).toBeUndefined();
  });

  it('应替换指定位置的元素', () => {
    const { result } = renderHook(() => useArray(initial, 'id'));

    act(() => {
      result.current[1].splice(1, 1, { id: 20, name: 'Replaced' });
    });

    expect(result.current[0]).toHaveLength(3);
    expect(result.current[0][1]!.name).toBe('Replaced');
  });
});

// ─── clear / reset ───────────────────────────────────

describe('useArray - clear / reset', () => {
  it('clear 应清空数组', () => {
    const { result } = renderHook(() => useArray(initial, 'id'));

    act(() => {
      result.current[1].clear();
    });

    expect(result.current[0]).toEqual([]);
  });

  it('reset 应恢复到初始状态', () => {
    const { result } = renderHook(() => useArray(initial, 'id'));

    act(() => {
      result.current[1].push({ id: 4, name: 'Dave' });
      result.current[1].remove(1);
    });

    // 状态已改变
    expect(result.current[0]).not.toEqual(initial);

    act(() => {
      result.current[1].reset();
    });

    expect(result.current[0]).toEqual(initial);
  });
});

// ─── updateState（直接更新） ─────────────────────────────

describe('useArray - updateState', () => {
  it('应支持直接传入新数组', () => {
    const { result } = renderHook(() => useArray(initial, 'id'));
    const newData = [{ id: 10, name: 'New' }];

    act(() => {
      result.current[1].updateState(newData);
    });

    expect(result.current[0]).toEqual(newData);
  });

  it('应支持 updater 函数', () => {
    const { result } = renderHook(() => useArray(initial, 'id'));

    act(() => {
      result.current[1].updateState(prev => prev.filter(i => i.id !== 2));
    });

    expect(result.current[0]).toHaveLength(2);
    expect(result.current[0].find(i => i.id === 2)).toBeUndefined();
  });
});

// ─── findItem（同步查找） ────────────────────────────────

describe('useArray - findItem', () => {
  it('应按 key 查找到元素', () => {
    const { result } = renderHook(() => useArray(initial, 'id'));

    const item = result.current[1].findItem(2);
    expect(item).toEqual({ id: 2, name: 'Bob' });
  });

  it('查找不存在的 key 应返回 undefined', () => {
    const { result } = renderHook(() => useArray(initial, 'id'));

    const item = result.current[1].findItem(999);
    expect(item).toBeUndefined();
  });
});

// ─── 默认 key（id）──────────────────────────────────────

describe('useArray - 默认 key', () => {
  it('不传 key 参数应默认使用 id', () => {
    const { result } = renderHook(() => useArray(initial));

    act(() => {
      result.current[1].push({ id: 1, name: 'Dup' }); // 与 Alice 的 id 重复
    });

    expect(result.current[0]).toHaveLength(3); // 去重生效
  });
});

// ─── Use Case: 用户完整行为链 ────────────────────────────

describe('useArray - Use Case: 标签列表管理', () => {
  it('用户添加 → 排序 → 移动 → 删除 → 重置 完整流程', () => {
    const { result } = renderHook(() => useArray<Item, 'id'>([], 'id'));

    // 1. 用户逐个添加标签
    act(() => {
      result.current[1].push({ id: 1, name: 'React' });
      result.current[1].push({ id: 2, name: 'Vue' });
      result.current[1].push({ id: 3, name: 'Angular' });
    });
    expect(result.current[0]).toHaveLength(3);

    // 2. 用户排序
    act(() => {
      result.current[1].sort((a, b) => a.name.localeCompare(b.name));
    });
    expect(result.current[0][0]!.name).toBe('Angular');

    // 3. 用户把 Vue 上移
    act(() => {
      result.current[1].up(2); // Vue
    });

    // 4. 用户删除 Angular
    act(() => {
      result.current[1].remove(3);
    });
    expect(result.current[0]).toHaveLength(2);
    expect(result.current[1].findItem(3)).toBeUndefined();

    // 5. 用户重置
    act(() => {
      result.current[1].reset();
    });
    expect(result.current[0]).toEqual([]);
  });
});
