import { act, renderHook } from '@testing-library/react';
import useCaptcha from '../src/use-captcha';

function getCountingLabel(count: number) {
  return `${count}秒后重新获取`;
}

function rejectTarget() {
  return false;
}

describe('useCaptcha', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('初始化时应使用默认文案', () => {
    const { result } = renderHook(() => useCaptcha());

    expect(result.current.label).toBe('获取验证码');
    expect(result.current.loading).toBe(false);
    expect(result.current.isCounting).toBe(false);
  });

  it('校验失败时不应发送验证码', async () => {
    const request = vi.fn();

    const { result } = renderHook(() =>
      useCaptcha('获取验证码', getCountingLabel, {
        request,
        validateTarget: rejectTarget
      })
    );

    await act(async () => {
      await result.current.getCaptcha('');
    });

    expect(request).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.isCounting).toBe(false);
  });

  it('默认手机号校验失败时不应发送验证码', async () => {
    const request = vi.fn();

    const { result } = renderHook(() => useCaptcha('获取验证码', getCountingLabel, { request }));

    await act(async () => {
      await result.current.getCaptcha('12345678901');
    });

    expect(request).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.isCounting).toBe(false);
  });

  it('默认请求期间应进入 loading 并清空文案', async () => {
    const { result } = renderHook(() => useCaptcha());

    let task: Promise<void> | undefined;

    act(() => {
      task = result.current.getCaptcha('13800138000');
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.label).toBe('');

    await act(async () => {
      vi.advanceTimersByTime(500);
      await task;
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.isCounting).toBe(true);
  });

  it('请求成功后应进入倒计时并使用倒计时文案', async () => {
    const request = vi.fn();

    const { result } = renderHook(() => useCaptcha('获取验证码', getCountingLabel, { request }));

    await act(async () => {
      await result.current.getCaptcha('13800138000');
    });

    expect(request).toHaveBeenCalledWith('13800138000');
    expect(result.current.loading).toBe(false);
    expect(result.current.isCounting).toBe(true);
    expect(result.current.label).toBe('10秒后重新获取');
  });
});
