import { describe, expect, it } from 'vitest';
import {
  getRecommendedColorPalette,
  getRecommendedColorPaletteFamily,
  getRecommendedPaletteColorByNumber
} from '../../src/palette/recommend';

const HEX_REGEX = /^#[0-9a-f]{6}$/;

// ==================== getRecommendedColorPaletteFamily ====================

describe('getRecommendedColorPaletteFamily', () => {
  it('应返回 11 个调色板', () => {
    const family = getRecommendedColorPaletteFamily('#1890ff');
    expect(family.palettes).toHaveLength(11);
  });

  it('应返回颜色名称', () => {
    const family = getRecommendedColorPaletteFamily('#1890ff');
    expect(family.name).toBeTruthy();
  });

  it('每个调色板应为有效 hex', () => {
    const family = getRecommendedColorPaletteFamily('#1890ff');
    family.palettes.forEach(p => {
      expect(p.hex).toMatch(HEX_REGEX);
    });
  });

  it('无效颜色应抛错', () => {
    expect(() => getRecommendedColorPaletteFamily('invalid')).toThrow();
  });
});

// ==================== getRecommendedColorPalette ====================

describe('getRecommendedColorPalette', () => {
  it('应返回 colorMap', () => {
    const result = getRecommendedColorPalette('#1890ff');
    expect(result.colorMap).toBeInstanceOf(Map);
    expect(result.colorMap.size).toBe(11);
  });

  it('应返回 main（500 色阶）', () => {
    const result = getRecommendedColorPalette('#1890ff');
    expect(result.main).toBeDefined();
    expect(result.main.number).toBe(500);
  });

  it('应返回 match', () => {
    const result = getRecommendedColorPalette('#1890ff');
    expect(result.match).toBeDefined();
    expect(result.match.hex).toMatch(HEX_REGEX);
  });
});

// ==================== getRecommendedPaletteColorByNumber ====================

describe('getRecommendedPaletteColorByNumber', () => {
  it('应返回指定色阶的 hex', () => {
    expect(getRecommendedPaletteColorByNumber('#1890ff', 500)).toMatch(HEX_REGEX);
  });

  it('不同色阶应返回不同颜色', () => {
    const c100 = getRecommendedPaletteColorByNumber('#1890ff', 100);
    const c900 = getRecommendedPaletteColorByNumber('#1890ff', 900);
    expect(c100).not.toBe(c900);
  });

  it('不同输入颜色应生成不同结果', () => {
    const red = getRecommendedPaletteColorByNumber('#ff0000', 500);
    const blue = getRecommendedPaletteColorByNumber('#0000ff', 500);
    expect(red).not.toBe(blue);
  });
});
