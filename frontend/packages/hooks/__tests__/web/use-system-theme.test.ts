import { act, renderHook } from '@testing-library/react';
import { useSystemTheme } from '../../src/web/use-system-theme';

/**
 * 创建 matchMedia mock
 *
 * 返回一个控制器，可以动态切换 dark/light 并触发 change 事件
 */
function createMatchMediaMock(initialDark = false) {
  let isDark = initialDark;
  const listeners: Array<(e: MediaQueryListEvent) => void> = [];

  const matchMediaMock = vi.fn().mockImplementation((query: string) => ({
    matches: query === '(prefers-color-scheme: dark)' ? isDark : false,
    media: query,
    addEventListener: (_event: string, handler: (e: MediaQueryListEvent) => void) => {
      listeners.push(handler);
    },
    removeEventListener: (_event: string, handler: (e: MediaQueryListEvent) => void) => {
      const index = listeners.indexOf(handler);
      if (index > -1) listeners.splice(index, 1);
    }
  }));

  function toggle(dark: boolean) {
    isDark = dark;
    listeners.forEach(listener => listener({ matches: dark } as MediaQueryListEvent));
  }

  return { matchMediaMock, toggle, getListenerCount: () => listeners.length };
}

describe('useSystemTheme', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('light mode 环境下应返回正确状态', () => {
    const { matchMediaMock } = createMatchMediaMock(false);
    window.matchMedia = matchMediaMock;

    const { result } = renderHook(() => useSystemTheme());

    expect(result.current.isDarkMode).toBe(false);
    expect(result.current.isLightMode).toBe(true);
    expect(result.current.themeName).toBe('light');
  });

  it('dark mode 环境下应返回正确状态', () => {
    const { matchMediaMock } = createMatchMediaMock(true);
    window.matchMedia = matchMediaMock;

    const { result } = renderHook(() => useSystemTheme());

    expect(result.current.isDarkMode).toBe(true);
    expect(result.current.isLightMode).toBe(false);
    expect(result.current.themeName).toBe('dark');
  });

  it('系统主题切换时应响应变化', () => {
    const { matchMediaMock, toggle } = createMatchMediaMock(false);
    window.matchMedia = matchMediaMock;

    const { result } = renderHook(() => useSystemTheme());

    expect(result.current.themeName).toBe('light');

    // 系统切换到 dark mode
    act(() => {
      toggle(true);
    });

    expect(result.current.isDarkMode).toBe(true);
    expect(result.current.themeName).toBe('dark');

    // 再切回 light mode
    act(() => {
      toggle(false);
    });

    expect(result.current.isDarkMode).toBe(false);
    expect(result.current.themeName).toBe('light');
  });

  it('卸载后应移除事件监听器', () => {
    const { getListenerCount, matchMediaMock } = createMatchMediaMock(false);
    window.matchMedia = matchMediaMock;

    const { unmount } = renderHook(() => useSystemTheme());

    expect(getListenerCount()).toBe(1);

    unmount();

    expect(getListenerCount()).toBe(0);
  });
});
