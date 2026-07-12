import { describe, expect, it } from 'vitest';
import { getColorPalette, getPaletteColorByNumber } from '../../src/palette';

const HEX_REGEX = /^#[0-9a-f]{6}$/;

function hasDifference(a: Map<any, string>, b: Map<any, string>) {
  let diff = false;
  a.forEach((hex, number) => {
    if (hex !== b.get(number)) {
      diff = true;
    }
  });
  return diff;
}

// ==================== getColorPalette ====================

describe('getColorPalette', () => {
  it('默认（AntD）模式应返回 11 个颜色', () => {
    const map = getColorPalette('#1890ff');
    expect(map.size).toBe(11);
  });

  it('推荐模式应返回 11 个颜色', () => {
    const map = getColorPalette('#1890ff', 'recommended');
    expect(map.size).toBe(11);
  });

  it('OKLCH 模式应返回 11 个颜色', () => {
    const map = getColorPalette('#1890ff', 'oklch');
    expect(map.size).toBe(11);
  });

  it('所有颜色应为有效 hex', () => {
    const map = getColorPalette('#1890ff');
    map.forEach(hex => {
      expect(hex).toMatch(HEX_REGEX);
    });
  });

  it('应包含所有标准色阶', () => {
    const map = getColorPalette('#1890ff');
    const expectedNumbers = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
    expectedNumbers.forEach(n => {
      expect(map.has(n as any)).toBe(true);
    });
  });

  it('三种算法应返回不同结果', () => {
    const antd = getColorPalette('#1890ff', 'antd');
    const recommended = getColorPalette('#1890ff', 'recommended');
    const oklch = getColorPalette('#1890ff', 'oklch');

    expect(hasDifference(antd, recommended)).toBe(true);
    expect(hasDifference(antd, oklch)).toBe(true);
    expect(hasDifference(recommended, oklch)).toBe(true);
  });
});

// ==================== getPaletteColorByNumber ====================

describe('getPaletteColorByNumber', () => {
  it('应返回有效 hex', () => {
    expect(getPaletteColorByNumber('#1890ff', 500)).toMatch(HEX_REGEX);
  });

  it('推荐模式应返回有效 hex', () => {
    expect(getPaletteColorByNumber('#1890ff', 500, 'recommended')).toMatch(HEX_REGEX);
  });

  it('OKLCH 模式应返回有效 hex', () => {
    expect(getPaletteColorByNumber('#1890ff', 500, 'oklch')).toMatch(HEX_REGEX);
  });

  it('不同色阶应返回不同颜色', () => {
    const c50 = getPaletteColorByNumber('#1890ff', 50);
    const c950 = getPaletteColorByNumber('#1890ff', 950);
    expect(c50).not.toBe(c950);
  });
});
