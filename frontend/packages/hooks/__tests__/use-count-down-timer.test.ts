import { act, renderHook } from '@testing-library/react';
import useCountDownTimer from '../src/use-count-down-timer';

describe('useCountDownTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('初始化时不应处于倒计时状态', () => {
    const { result } = renderHook(() => useCountDownTimer(60));

    expect(result.current.isCounting).toBe(false);
    expect(result.current.count).toBe(0);
  });

  it('start 应开始倒计时', () => {
    const { result } = renderHook(() => useCountDownTimer(60));

    act(() => {
      result.current.start();
    });

    expect(result.current.isCounting).toBe(true);
  });

  it('start 传入自定义秒数应覆盖默认值', () => {
    const { result } = renderHook(() => useCountDownTimer(60));

    act(() => {
      result.current.start(10);
    });

    expect(result.current.isCounting).toBe(true);
  });

  it('stop 应停止倒计时', () => {
    const { result } = renderHook(() => useCountDownTimer(60));

    act(() => {
      result.current.start();
    });
    expect(result.current.isCounting).toBe(true);

    act(() => {
      result.current.stop();
    });
    expect(result.current.isCounting).toBe(false);
  });
});
