import type { AnyColor } from 'colord';
import { getHex } from '../shared';
import type { ColorPaletteNumber, PaletteAlgorithm } from '../types';
import { getAntDColorPalette } from './antd';
import { generateOklchPalette } from './oklch';
import { getRecommendedColorPalette } from './recommend';

export * from './oklch';

export { getRecommendedColorPalette, getRecommendedPaletteColorByNumber } from './recommend';

/**
 * Get color palette by provided color
 *
 * @param color Any valid color value
 * @param algorithm The palette generation algorithm (default: 'antd')
 */
export function getColorPalette(color: AnyColor, algorithm: PaletteAlgorithm = 'antd') {
  const colorMap = new Map<ColorPaletteNumber, string>();

  if (algorithm === 'recommended') {
    const colorPalette = getRecommendedColorPalette(getHex(color));
    colorPalette.palettes.forEach(palette => {
      colorMap.set(palette.number, palette.hex);
    });
  } else if (algorithm === 'oklch') {
    const family = generateOklchPalette(getHex(color));
    family.palettes.forEach(palette => {
      colorMap.set(palette.number, palette.hex);
    });
  } else {
    const colors = getAntDColorPalette(color);

    const colorNumbers: ColorPaletteNumber[] = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

    colorNumbers.forEach((number, index) => {
      colorMap.set(number, colors[index]);
    });
  }

  return colorMap;
}

/**
 * Get color palette color by number
 *
 * @param color The provided color
 * @param number The color palette number
 * @param algorithm The palette generation algorithm (default: 'antd')
 */
export function getPaletteColorByNumber(
  color: AnyColor,
  number: ColorPaletteNumber,
  algorithm: PaletteAlgorithm = 'antd'
) {
  const colorMap = getColorPalette(color, algorithm);

  return colorMap.get(number as ColorPaletteNumber)!;
}
