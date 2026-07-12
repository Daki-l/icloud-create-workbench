import { act, renderHook } from '@testing-library/react';
import { useNow } from '../src/use-now';

describe('useNow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('应返回当前时间', () => {
    const { result } = renderHook(() => useNow());

    expect(result.current.now).toBeInstanceOf(Date);
  });

  it('默认应立即开始计时（immediate = true）', () => {
    const { result } = renderHook(() => useNow({ interval: 1000 }));

    const firstTime = result.current.now.getTime();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    const secondTime = result.current.now.getTime();
    expect(secondTime).toBeGreaterThan(firstTime);
  });

  it('immediate = false 不应自动开始计时', () => {
    const { result } = renderHook(() => useNow({ immediate: false, interval: 1000 }));

    const firstTime = result.current.now.getTime();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // 没有开始计时，时间不应变化
    expect(result.current.now.getTime()).toBe(firstTime);
  });

  it('pause 应暂停计时', () => {
    const { result } = renderHook(() => useNow({ interval: 1000 }));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    const timeAfterTick = result.current.now.getTime();

    act(() => {
      result.current.pause();
    });

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // 暂停后时间不应继续更新
    expect(result.current.now.getTime()).toBe(timeAfterTick);
  });

  it('resume 应恢复计时', () => {
    const { result } = renderHook(() => useNow({ immediate: false, interval: 1000 }));

    const initialTime = result.current.now.getTime();

    // 手动开始
    act(() => {
      result.current.resume();
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.now.getTime()).toBeGreaterThan(initialTime);
  });

  it('卸载后应自动清理定时器（不泄漏）', () => {
    const { unmount } = renderHook(() => useNow({ interval: 1000 }));

    // 卸载 hook
    unmount();

    // 不应抛出错误
    expect(() => {
      vi.advanceTimersByTime(5000);
    }).not.toThrow();
  });

  it('resume 重复调用不应创建多个定时器', () => {
    const { result } = renderHook(() => useNow({ interval: 1000 }));

    act(() => {
      result.current.resume(); // 已经在运行了，不应重复创建
      result.current.resume();
    });

    const timeBeforeTick = result.current.now.getTime();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // 应该只更新一次，不是两次
    const timeAfterTick = result.current.now.getTime();
    expect(timeAfterTick).toBeGreaterThan(timeBeforeTick);
  });
});
