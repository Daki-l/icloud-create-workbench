import { describe, expect, it, vi } from 'vitest';
import { isHttpUrl, isMacOs, isNil, isPC, isWindow, isWindowsOs, noop, omitUndefined } from '../src/utils';

// ==================== noop ====================

describe('noop', () => {
  it('应返回 undefined', () => {
    expect(noop()).toBeUndefined();
  });
});

// ==================== isNil ====================

describe('isNil', () => {
  it('null 应返回 true', () => {
    expect(isNil(null)).toBe(true);
  });

  it('undefined 应返回 true', () => {
    expect(isNil(undefined)).toBe(true);
  });

  it('0 应返回 false', () => {
    expect(isNil(0)).toBe(false);
  });

  it('空字符串应返回 false', () => {
    expect(isNil('')).toBe(false);
  });

  it('false 应返回 false', () => {
    expect(isNil(false)).toBe(false);
  });

  it('空对象应返回 false', () => {
    expect(isNil({})).toBe(false);
  });
});

// ==================== isHttpUrl ====================

describe('isHttpUrl', () => {
  it('http URL 应返回 true', () => {
    expect(isHttpUrl('http://example.com')).toBe(true);
  });

  it('https URL 应返回 true', () => {
    expect(isHttpUrl('https://example.com')).toBe(true);
  });

  it('带路径的 URL 应返回 true', () => {
    expect(isHttpUrl('https://example.com/path?q=1')).toBe(true);
  });

  it('ftp 协议应返回 false', () => {
    expect(isHttpUrl('ftp://example.com')).toBe(false);
  });

  it('无协议应返回 false', () => {
    expect(isHttpUrl('example.com')).toBe(false);
  });

  it('空字符串应返回 false', () => {
    expect(isHttpUrl('')).toBe(false);
  });

  it('undefined 应返回 false', () => {
    expect(isHttpUrl(undefined)).toBe(false);
  });
});

// ==================== isWindow ====================

describe('isWindow', () => {
  it('window 对象应返回 true', () => {
    expect(isWindow(window)).toBe(true);
  });

  it('null 应返回 false', () => {
    expect(isWindow(null)).toBe(false);
  });

  it('普通对象应返回 false', () => {
    expect(isWindow({})).toBe(false);
  });
});

// ==================== isMacOs ====================

describe('isMacOs', () => {
  it('Mac userAgent 应返回 true', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    );
    expect(isMacOs()).toBe(true);
    vi.restoreAllMocks();
  });

  it('Windows userAgent 应返回 false', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    );
    expect(isMacOs()).toBe(false);
    vi.restoreAllMocks();
  });
});

// ==================== isWindowsOs ====================

describe('isWindowsOs', () => {
  it('Windows userAgent 应返回 true', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    );
    expect(isWindowsOs()).toBe(true);
    vi.restoreAllMocks();
  });

  it('Mac userAgent 应返回 false', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    );
    expect(isWindowsOs()).toBe(false);
    vi.restoreAllMocks();
  });
});

// ==================== isPC ====================

describe('isPC', () => {
  it('桌面端 userAgent 应返回 true', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    );
    expect(isPC()).toBe(true);
    vi.restoreAllMocks();
  });

  it('iPhone userAgent 应返回 false', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/537.36'
    );
    expect(isPC()).toBe(false);
    vi.restoreAllMocks();
  });

  it('Android userAgent 应返回 false', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36');
    expect(isPC()).toBe(false);
    vi.restoreAllMocks();
  });
});

describe('omitUndefined', () => {
  it('应只移除值为 undefined 的字段', () => {
    expect(
      omitUndefined({
        empty: '',
        falseValue: false,
        nil: null,
        skip: undefined,
        zero: 0
      })
    ).toEqual({
      empty: '',
      falseValue: false,
      nil: null,
      zero: 0
    });
  });
});
