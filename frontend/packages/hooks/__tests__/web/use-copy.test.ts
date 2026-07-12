import { act, renderHook } from '@testing-library/react';
import { useCopy } from '../../src/web/use-copy';

describe('useCopy', () => {
  beforeEach(() => {
    // Mock navigator.clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined)
      },
      writable: true,
      configurable: true
    });

    // Mock window.isSecureContext
    Object.defineProperty(window, 'isSecureContext', {
      value: true,
      writable: true,
      configurable: true
    });
  });

  it('初始状态 copied 应为 false，copiedText 应为空', () => {
    const { result } = renderHook(() => useCopy());

    expect(result.current.copied).toBe(false);
    expect(result.current.copiedText).toBe('');
  });

  it('copy 成功应设置 copied 为 true 并记录文本', async () => {
    const { result } = renderHook(() => useCopy());

    let success = false;
    await act(async () => {
      success = await result.current.copy('Hello World');
    });

    expect(success).toBe(true);
    expect(result.current.copied).toBe(true);
    expect(result.current.copiedText).toBe('Hello World');
  });

  it('copy 空字符串应返回 false', async () => {
    const { result } = renderHook(() => useCopy());

    let success = true;
    await act(async () => {
      success = await result.current.copy('');
    });

    expect(success).toBe(false);
    expect(result.current.copied).toBe(false);
  });

  it('clipboard API 失败应设置 copied 为 false', async () => {
    // 让 clipboard.writeText 失败
    (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('denied'));

    // 同时让 legacyCopy 也失败（document.execCommand 不存在）
    Object.defineProperty(window, 'isSecureContext', {
      value: true,
      writable: true,
      configurable: true
    });

    const { result } = renderHook(() => useCopy());

    let success = true;
    await act(async () => {
      success = await result.current.copy('test');
    });

    expect(success).toBe(false);
    expect(result.current.copied).toBe(false);
    expect(result.current.copiedText).toBe('');
  });

  it('非 secure context 应走 legacyCopy 路径', async () => {
    // 模拟非 secure context
    Object.defineProperty(window, 'isSecureContext', {
      value: false,
      writable: true,
      configurable: true
    });

    // Mock document.execCommand
    const execCommandMock = vi.fn().mockReturnValue(true);
    document.execCommand = execCommandMock;

    const { result } = renderHook(() => useCopy());

    let success = false;
    await act(async () => {
      success = await result.current.copy('fallback text');
    });

    expect(success).toBe(true);
    expect(result.current.copied).toBe(true);
    expect(result.current.copiedText).toBe('fallback text');
    expect(execCommandMock).toHaveBeenCalledWith('copy');
  });
});
