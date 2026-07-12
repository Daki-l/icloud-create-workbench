import { act, renderHook } from '@testing-library/react';
import useLoading from '../src/use-loading';

describe('useLoading', () => {
  it('默认 loading 应为 false', () => {
    const { result } = renderHook(() => useLoading());

    expect(result.current.loading).toBe(false);
  });

  it('传入 true 应初始化为 loading 状态', () => {
    const { result } = renderHook(() => useLoading(true));

    expect(result.current.loading).toBe(true);
  });

  it('startLoading 应设置为 true', () => {
    const { result } = renderHook(() => useLoading());

    act(() => {
      result.current.startLoading();
    });

    expect(result.current.loading).toBe(true);
  });

  it('endLoading 应设置为 false', () => {
    const { result } = renderHook(() => useLoading(true));

    act(() => {
      result.current.endLoading();
    });

    expect(result.current.loading).toBe(false);
  });

  it('完整流程：start → end → start', () => {
    const { result } = renderHook(() => useLoading());

    expect(result.current.loading).toBe(false);

    act(() => result.current.startLoading());
    expect(result.current.loading).toBe(true);

    act(() => result.current.endLoading());
    expect(result.current.loading).toBe(false);

    act(() => result.current.startLoading());
    expect(result.current.loading).toBe(true);
  });
});
