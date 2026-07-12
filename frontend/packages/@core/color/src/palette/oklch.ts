// oxlint-disable unicorn/no-array-sort
/**
 * OKLCH Color Palette Generator - Professional Edition
 *
 * A world-class color palette generator inspired by Apple's Human Interface Guidelines. Uses OKLCH color space for
 * perceptually uniform color manipulation.
 *
 * Key features: 1. OKLCH color space - perceptually uniform (unlike HSL) 2. Data-driven lightness curve - based on
 * actual Tailwind analysis 3. Hue-aware chroma compensation - different curves for different hues 4. WCAG contrast
 * checking - ensures accessibility compliance 5. Apple-style hue rotation - warm/cool color temperature shifts 6.
 * Precise gamut mapping - maximizes color vibrancy within sRGB
 */

import { displayable, formatHex, oklch, parse, wcagContrast } from 'culori';
import type { Oklch } from 'culori';
import { getColorName } from '../shared';
import type { ColorPalette, ColorPaletteFamily, ColorPaletteMatch, ColorPaletteNumber } from '../types';

/**
 * Tailwind color palette numbers with their target lightness values Based on actual analysis of Tailwind's official
 * palettes in OKLCH space These values are averaged from Blue, Red, and Green palettes
 */
const PALETTE_CONFIG: { number: ColorPaletteNumber; targetL: number }[] = [
  { number: 50, targetL: 0.974 },
  { number: 100, targetL: 0.943 },
  { number: 200, targetL: 0.897 },
  { number: 300, targetL: 0.829 },
  { number: 400, targetL: 0.742 },
  { number: 500, targetL: 0.661 },
  { number: 600, targetL: 0.583 },
  { number: 700, targetL: 0.507 },
  { number: 800, targetL: 0.439 },
  { number: 900, targetL: 0.389 },
  { number: 950, targetL: 0.269 }
];

/** Hue ranges for different color families Used for hue-specific chroma and lightness adjustments */
const HUE_FAMILIES = {
  red: { start: 0, end: 40, peakL: 0.6, maxC: 0.25 },
  orange: { start: 40, end: 70, peakL: 0.7, maxC: 0.2 },
  yellow: { start: 70, end: 110, peakL: 0.85, maxC: 0.18 }, // Yellow needs higher L for vibrancy
  green: { start: 110, end: 170, peakL: 0.65, maxC: 0.22 },
  cyan: { start: 170, end: 210, peakL: 0.75, maxC: 0.15 }, // Cyan has limited chroma in sRGB
  blue: { start: 210, end: 270, peakL: 0.55, maxC: 0.25 },
  purple: { start: 270, end: 320, peakL: 0.55, maxC: 0.28 },
  pink: { start: 320, end: 360, peakL: 0.6, maxC: 0.24 }
} as const;

/** Get the hue family for a given hue value */
function getHueFamily(hue: number): (typeof HUE_FAMILIES)[keyof typeof HUE_FAMILIES] {
  const normalizedHue = ((hue % 360) + 360) % 360;

  for (const family of Object.values(HUE_FAMILIES)) {
    if (normalizedHue >= family.start && normalizedHue < family.end) {
      return family;
    }
  }
  return HUE_FAMILIES.red; // Default for hue near 360/0
}

/**
 * Calculate hue-aware chroma compensation factor based on lightness Different hues have different optimal lightness
 * ranges for maximum chroma
 *
 * This is based on the actual shape of the sRGB gamut in OKLCH space:
 *
 * - Yellow peaks at high lightness (~0.85)
 * - Blue/Purple peak at lower lightness (~0.55)
 * - Red/Green are in the middle (~0.6-0.65)
 */
function getHueAwareChromaCompensation(lightness: number, hue: number): number {
  const family = getHueFamily(hue);
  const peakL = family.peakL;

  const distance = Math.abs(lightness - peakL);
  const maxDistance = Math.max(peakL, 1 - peakL);
  const normalized = distance / maxDistance;

  // Asymmetric curve - steeper falloff towards edges
  // This better matches the actual sRGB gamut shape
  if (lightness < peakL) {
    // Darker than peak - moderate falloff
    return 1 - 0.55 * normalized ** 1.8;
  }
  // Lighter than peak - steeper falloff (white kills saturation faster)
  return 1 - 0.7 * normalized ** 1.5;
}

/** Normalize hue to [0, 360) range */
function normalizeHue(h: number): number {
  return ((h % 360) + 360) % 360;
}

/** Parse any color format to OKLCH */
function toOklch(color: string): Oklch | undefined {
  const parsed = parse(color);
  if (!parsed) return undefined;
  return oklch(parsed);
}

/**
 * Convert OKLCH to hex with advanced gamut mapping Uses binary search to find the maximum displayable chroma This
 * preserves more color vibrancy than simple clamping
 */
function oklchToHex(color: Oklch): string {
  // First check if already displayable
  if (displayable(color)) {
    return formatHex(color);
  }

  // Binary search for maximum chroma that's displayable
  // This is more accurate than clampChroma for edge cases
  let low = 0;
  let high = color.c ?? 0;
  let bestColor = { ...color, c: 0 };

  // 12 iterations gives us ~0.001 precision
  for (let i = 0; i < 12; i += 1) {
    const mid = (low + high) / 2;
    const testColor = { ...color, c: mid };

    if (displayable(testColor)) {
      bestColor = testColor;
      low = mid;
    } else {
      high = mid;
    }
  }

  return formatHex(bestColor);
}

/**
 * Calculate Apple-style hue rotation Warm colors shift toward yellow when lighter, toward red when darker Cool colors
 * shift toward cyan when lighter, toward deep blue when darker
 *
 * This mimics how colors appear under natural lighting conditions
 */
function getAppleHueShift(hue: number, lightness: number): number {
  const normalizedHue = ((hue % 360) + 360) % 360;

  // Determine if warm or cool
  const isWarm = (normalizedHue >= 0 && normalizedHue < 90) || normalizedHue >= 300;
  const isCool = normalizedHue >= 180 && normalizedHue < 300;

  // Calculate shift based on distance from middle lightness
  const lightnessDelta = lightness - 0.5;

  if (isWarm) {
    // Warm: lighter → yellow (increase hue), darker → red (decrease hue)
    // But cap the shift to prevent drastic color changes
    return lightnessDelta * 8; // max ±4 degrees
  }

  if (isCool) {
    // Cool: lighter → cyan, darker → deep blue
    return -lightnessDelta * 6; // max ±3 degrees
  }

  // Neutral zone (greens, teals) - minimal shift
  return -lightnessDelta * 3;
}

/**
 * Generate a complete color palette from a single color
 *
 * Algorithm:
 *
 * 1. Convert input to OKLCH
 * 2. Find the closest palette step based on lightness
 * 3. Calculate the base chroma using hue-aware compensation
 * 4. Generate all 11 steps with:
 *
 *    - Target lightness from PALETTE_CONFIG
 *    - Chroma adjusted per-hue for optimal vibrancy
 *    - Apple-style hue rotation for natural appearance
 *    - Precise gamut mapping via binary search
 *
 * @param color - Any valid CSS color string
 * @returns ColorPaletteFamily with all 11 color stops
 */
export function generateOklchPalette(color: string): ColorPaletteFamily {
  const inputOklch = toOklch(color);
  if (!inputOklch) {
    throw new Error(`Invalid color: ${color}`);
  }

  const { c: inputChroma, h: inputHue, l: inputL } = inputOklch;
  const safeHue = inputHue ?? 0;
  const safeChroma = inputChroma ?? 0;

  // Find the reference step - closest to input lightness
  let closestStep = PALETTE_CONFIG[5]; // default to 500
  let minDiff = Infinity;

  for (const step of PALETTE_CONFIG) {
    const diff = Math.abs(step.targetL - inputL);
    if (diff < minDiff) {
      minDiff = diff;
      closestStep = step;
    }
  }

  // Calculate the chroma at the reference lightness using hue-aware compensation
  const referenceCompensation = getHueAwareChromaCompensation(closestStep.targetL, safeHue);
  const baseChroma = safeChroma / Math.max(referenceCompensation, 0.1);

  // Generate color name
  let colorName = getColorName(color);
  colorName = colorName.toLowerCase().replace(/\s/g, '-');

  // Generate all palette colors
  const palettes: ColorPalette[] = PALETTE_CONFIG.map(({ number, targetL }) => {
    // Apply hue-aware chroma compensation for this lightness level
    const compensation = getHueAwareChromaCompensation(targetL, safeHue);
    let adjustedChroma = baseChroma * compensation;

    // Apply Apple-style hue rotation
    const hueShift = getAppleHueShift(safeHue, targetL);
    const adjustedHue = normalizeHue(safeHue + hueShift);

    // Ensure minimum chroma for saturated colors, prevent graying out
    if (safeChroma > 0.05) {
      adjustedChroma = Math.max(adjustedChroma, 0.015);
    }

    // Create the OKLCH color
    const generatedOklch: Oklch = {
      c: adjustedChroma,
      h: adjustedHue,
      l: targetL,
      mode: 'oklch'
    };

    // Convert to hex with precise gamut mapping
    const hex = oklchToHex(generatedOklch);

    return { hex, number };
  });

  return {
    name: colorName,
    palettes
  };
}

/**
 * Generate a palette and find the matching color step
 *
 * @param color - Input color
 * @returns Full palette match with colorMap, main (500), and match colors
 */
export function getOklchColorPalette(color: string): ColorPaletteMatch {
  const family = generateOklchPalette(color);

  const colorMap = new Map<ColorPaletteNumber, ColorPalette>();
  family.palettes.forEach(palette => {
    colorMap.set(palette.number, palette);
  });

  // Find the closest match to the original input
  const inputOklch = toOklch(color);
  let matchPalette = family.palettes[5]; // default to 500

  if (inputOklch) {
    let minDelta = Infinity;
    for (const palette of family.palettes) {
      const paletteOklch = toOklch(palette.hex);
      if (paletteOklch) {
        // Calculate Delta E in OKLCH space (simple Euclidean for now)
        const dL = (inputOklch.l - paletteOklch.l) * 100;
        const dC = ((inputOklch.c ?? 0) - (paletteOklch.c ?? 0)) * 100;
        const dH = normalizeHue((inputOklch.h ?? 0) - (paletteOklch.h ?? 0));
        const delta = Math.sqrt(dL * dL + dC * dC + dH * dH);

        if (delta < minDelta) {
          minDelta = delta;
          matchPalette = palette;
        }
      }
    }
  }

  return {
    ...family,
    colorMap,
    main: colorMap.get(500)!,
    match: matchPalette
  };
}

/**
 * Get a specific palette color by number
 *
 * @param color - Input color
 * @param number - Palette number (50, 100, 200, ..., 950)
 * @returns Hex color string
 */
export function getOklchPaletteColorByNumber(color: string, number: ColorPaletteNumber): string {
  const palette = getOklchColorPalette(color);
  return palette.colorMap.get(number)!.hex;
}

/** Advanced: Generate palette with custom configuration */
export interface OklchPaletteOptions {
  /**
   * Whether to apply Apple-style hue rotation
   *
   * @default true
   */
  appleHueShift?: boolean;
  /**
   * Whether to apply chroma compensation
   *
   * @default true
   */
  chromaCompensation?: boolean;
  /** Force the input color to be placed at this step If not specified, the closest step by lightness is used */
  forceStep?: ColorPaletteNumber;
  /**
   * Include OKLCH values in output
   *
   * @default false
   */
  includeOklch?: boolean;
  /** Custom lightness curve (11 values from light to dark) */
  lightnessCurve?: number[];
}

/** Extended color palette with OKLCH values */
export interface ColorPaletteWithOklch extends ColorPalette {
  /** OKLCH values as numbers */
  oklch: { c: number; h: number; l: number };
  /** CSS oklch() string, e.g. "oklch(58.5% 0.204 277.1)" */
  oklchCss: string;
}

/** Extended palette family with OKLCH values */
export interface ColorPaletteFamilyWithOklch extends Omit<ColorPaletteFamily, 'palettes'> {
  /** Input color's OKLCH values */
  inputOklch: { c: number; h: number; l: number };
  /** Input color's CSS oklch() string */
  inputOklchCss: string;
  /** The step that best matches the input color */
  matchedStep: ColorPaletteNumber;
  palettes: ColorPaletteWithOklch[];
}

/** Format OKLCH values to CSS string e.g. oklch(58.5% 0.204 277.1) */
function formatOklchCss(l: number, c: number, h: number): string {
  const lPercent = (l * 100).toFixed(2).replace(/\.?0+$/, '');
  const cValue = c.toFixed(3).replace(/\.?0+$/, '');
  const hValue = h.toFixed(2).replace(/\.?0+$/, '');
  return `oklch(${lPercent}% ${cValue} ${hValue})`;
}

/** Generate palette with custom options */
export function generateOklchPaletteAdvanced(color: string, options: OklchPaletteOptions = {}): ColorPaletteFamily {
  const { appleHueShift = true, chromaCompensation = true, forceStep, lightnessCurve } = options;

  const inputOklch = toOklch(color);
  if (!inputOklch) {
    throw new Error(`Invalid color: ${color}`);
  }

  const { c: inputChroma, h: inputHue, l: inputL } = inputOklch;
  const safeHue = inputHue ?? 0;
  const safeChroma = inputChroma ?? 0;

  // Use custom lightness curve or default
  const config =
    lightnessCurve && lightnessCurve.length === 11
      ? PALETTE_CONFIG.map((step, i) => ({ ...step, targetL: lightnessCurve[i] }))
      : PALETTE_CONFIG;

  // Find reference step - use forceStep if provided, otherwise find closest
  let closestStep = config[5];
  if (forceStep) {
    closestStep = config.find(s => s.number === forceStep) ?? config[5];
  } else {
    let minDiff = Infinity;
    for (const step of config) {
      const diff = Math.abs(step.targetL - inputL);
      if (diff < minDiff) {
        minDiff = diff;
        closestStep = step;
      }
    }
  }

  const referenceCompensation = chromaCompensation ? getHueAwareChromaCompensation(closestStep.targetL, safeHue) : 1;
  const baseChroma = safeChroma / Math.max(referenceCompensation, 0.1);

  let colorName = getColorName(color);
  colorName = colorName.toLowerCase().replace(/\s/g, '-');

  const palettes: ColorPalette[] = config.map(({ number, targetL }) => {
    const compensation = chromaCompensation ? getHueAwareChromaCompensation(targetL, safeHue) : 1;
    let adjustedChroma = baseChroma * compensation;

    let adjustedHue = safeHue;
    if (appleHueShift) {
      adjustedHue = normalizeHue(safeHue + getAppleHueShift(safeHue, targetL));
    }

    if (safeChroma > 0.05) {
      adjustedChroma = Math.max(adjustedChroma, 0.015);
    }

    const generatedOklch: Oklch = {
      c: adjustedChroma,
      h: adjustedHue,
      l: targetL,
      mode: 'oklch'
    };

    return { hex: oklchToHex(generatedOklch), number };
  });

  return { name: colorName, palettes };
}

/**
 * Generate palette with OKLCH values included The input color is preserved exactly at the matched step (not
 * approximated)
 *
 * @example
 *   ```ts
 *   // Auto-detect step
 *   const palette = generateOklchPaletteEx('#6366F1');
 *   // palette.matchedStep === 500
 *   // palette.palettes[5].hex === '#6366f1' (exact input preserved!)
 *
 *   // Force to 600
 *   const palette600 = generateOklchPaletteEx('#6366F1', 600);
 *   // palette600.palettes[6].hex === '#6366f1'
 *   ```;
 *
 * @param color - Input color (will be preserved exactly in output)
 * @param forceStep - Force input to this step (default: auto-detect, prefer 500 for mid-tones)
 * @returns Palette with OKLCH values for each color
 */
export function generateOklchPaletteEx(color: string, forceStep?: ColorPaletteNumber): ColorPaletteFamilyWithOklch {
  const inputOklchRaw = toOklch(color);
  if (!inputOklchRaw) {
    throw new Error(`Invalid color: ${color}`);
  }

  // Normalize input hex
  const inputHex = formatHex(parse(color));

  const safeHue = inputOklchRaw.h ?? 0;
  const safeChroma = inputOklchRaw.c ?? 0;
  const inputL = inputOklchRaw.l;

  // Determine matched step
  let matchedStep: ColorPaletteNumber;
  if (forceStep) {
    matchedStep = forceStep;
  } else {
    // Find closest step, but prefer 500 for mid-range colors
    let minDiff = Infinity;
    let closestStep: ColorPaletteNumber = 500;

    for (const step of PALETTE_CONFIG) {
      const diff = Math.abs(step.targetL - inputL);
      if (diff < minDiff) {
        minDiff = diff;
        closestStep = step.number;
      }
    }

    // If input lightness is close to 500's target (within 0.1), prefer 500
    const step500 = PALETTE_CONFIG.find(s => s.number === 500)!;
    const diffTo500 = Math.abs(step500.targetL - inputL);
    matchedStep = diffTo500 < 0.12 ? 500 : closestStep;
  }

  // Build adjusted lightness curve that passes through input at matchedStep
  const matchedStepConfig = PALETTE_CONFIG.find(s => s.number === matchedStep)!;
  const lightnessDelta = inputL - matchedStepConfig.targetL;

  const config = PALETTE_CONFIG.map(step => {
    if (step.number === matchedStep) {
      // Exact match - use input lightness
      return { ...step, targetL: inputL };
    }
    // Scale delta: full effect at matched step, reduced at extremes
    const distance = Math.abs(step.number - matchedStep) / 500;
    const adjustedDelta = lightnessDelta * (1 - distance * 0.6);
    const newL = Math.max(0.15, Math.min(0.98, step.targetL + adjustedDelta));
    return { ...step, targetL: newL };
  });

  const referenceCompensation = getHueAwareChromaCompensation(inputL, safeHue);
  const baseChroma = safeChroma / Math.max(referenceCompensation, 0.1);

  let colorName = getColorName(color);
  colorName = colorName.toLowerCase().replace(/\s/g, '-');

  const palettes: ColorPaletteWithOklch[] = config.map(({ number, targetL }) => {
    // For the matched step, use the exact input color
    if (number === matchedStep) {
      return {
        hex: inputHex ?? '',
        number,
        oklch: {
          c: safeChroma,
          h: safeHue,
          l: inputL
        },
        oklchCss: formatOklchCss(inputL, safeChroma, safeHue)
      };
    }

    const compensation = getHueAwareChromaCompensation(targetL, safeHue);
    let adjustedChroma = baseChroma * compensation;
    const adjustedHue = normalizeHue(safeHue + getAppleHueShift(safeHue, targetL));

    if (safeChroma > 0.05) {
      adjustedChroma = Math.max(adjustedChroma, 0.015);
    }

    const generatedOklch: Oklch = {
      c: adjustedChroma,
      h: adjustedHue,
      l: targetL,
      mode: 'oklch'
    };

    const hex = oklchToHex(generatedOklch);
    const finalOklch = toOklch(hex);
    const finalL = finalOklch?.l ?? targetL;
    const finalC = finalOklch?.c ?? adjustedChroma;
    const finalH = finalOklch?.h ?? adjustedHue;

    return {
      hex,
      number,
      oklch: {
        c: finalC,
        h: finalH,
        l: finalL
      },
      oklchCss: formatOklchCss(finalL, finalC, finalH)
    };
  });

  return {
    inputOklch: {
      c: safeChroma,
      h: safeHue,
      l: inputL
    },
    inputOklchCss: formatOklchCss(inputL, safeChroma, safeHue),
    matchedStep,
    name: colorName,
    palettes
  };
}

// ============================================================================
// WCAG Accessibility & Dark Mode Support
// ============================================================================

/** WCAG contrast level requirements */
export type WcagLevel = 'AA' | 'AAA';

/** Text size for WCAG contrast calculation */
export type TextSize = 'large' | 'normal';

/** Contrast check result for a palette */
export interface PaletteContrastInfo {
  /** Contrast ratios for each step against black (#000000) */
  contrastVsBlack: Map<ColorPaletteNumber, number>;
  /** Contrast ratios for each step against white (#ffffff) */
  contrastVsWhite: Map<ColorPaletteNumber, number>;
  /** The palette with contrast information */
  palette: ColorPaletteFamily;
  /** Steps that pass WCAG AA for normal text on black */
  passAAonBlack: ColorPaletteNumber[];
  /** Steps that pass WCAG AA for normal text on white */
  passAAonWhite: ColorPaletteNumber[];
  /** Recommended text color (white or black) for each step */
  recommendedTextColor: Map<ColorPaletteNumber, '#000000' | '#ffffff'>;
}

/**
 * Get WCAG contrast ratio between two colors
 *
 * @param color1 - First color (any CSS color string)
 * @param color2 - Second color (any CSS color string)
 * @returns Contrast ratio (1 to 21)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const c1 = parse(color1);
  const c2 = parse(color2);
  if (!c1 || !c2) return 1;
  return wcagContrast(c1, c2);
}

/**
 * Check if contrast ratio meets WCAG requirements
 *
 * @param ratio - Contrast ratio
 * @param level - WCAG level ('AA' or 'AAA')
 * @param textSize - Text size ('normal' or 'large')
 * @returns Whether the contrast passes
 */
export function meetsWcagContrast(ratio: number, level: WcagLevel = 'AA', textSize: TextSize = 'normal'): boolean {
  const requirements = {
    AA: { normal: 4.5, large: 3 },
    AAA: { normal: 7, large: 4.5 }
  };
  return ratio >= requirements[level][textSize];
}

/**
 * Generate a palette with full WCAG contrast information
 *
 * @param color - Input color
 * @returns Palette with contrast analysis
 */
export function generateOklchPaletteWithContrast(color: string): PaletteContrastInfo {
  const palette = generateOklchPalette(color);

  const contrastVsWhite = new Map<ColorPaletteNumber, number>();
  const contrastVsBlack = new Map<ColorPaletteNumber, number>();
  const passAAonWhite: ColorPaletteNumber[] = [];
  const passAAonBlack: ColorPaletteNumber[] = [];
  const recommendedTextColor = new Map<ColorPaletteNumber, '#000000' | '#ffffff'>();

  for (const { hex, number } of palette.palettes) {
    const vsWhite = getContrastRatio(hex, '#ffffff');
    const vsBlack = getContrastRatio(hex, '#000000');

    contrastVsWhite.set(number, vsWhite);
    contrastVsBlack.set(number, vsBlack);

    if (meetsWcagContrast(vsWhite)) {
      passAAonWhite.push(number);
    }
    if (meetsWcagContrast(vsBlack)) {
      passAAonBlack.push(number);
    }

    // Recommend text color based on higher contrast
    recommendedTextColor.set(number, vsWhite > vsBlack ? '#ffffff' : '#000000');
  }

  return {
    contrastVsBlack,
    contrastVsWhite,
    palette,
    passAAonBlack,
    passAAonWhite,
    recommendedTextColor
  };
}

/** Dark mode optimized lightness curve Designed for better visibility on dark backgrounds */
const DARK_MODE_LIGHTNESS: number[] = [
  0.18, // 50 - darkest
  0.25,
  0.32,
  0.4,
  0.5,
  0.6, // 500 - main
  0.7,
  0.78,
  0.85,
  0.91,
  0.96 // 950 - lightest
];

/**
 * Generate a dark mode optimized palette Inverts the lightness curve for better dark theme compatibility
 *
 * @param color - Input color
 * @returns Dark mode optimized palette
 */
export function generateDarkModePalette(color: string): ColorPaletteFamily {
  return generateOklchPaletteAdvanced(color, {
    appleHueShift: true,
    chromaCompensation: true,
    lightnessCurve: DARK_MODE_LIGHTNESS
  });
}

/**
 * Find the best palette step for text on a given background color Ensures WCAG AA compliance
 *
 * @param paletteColor - Base color for the palette
 * @param backgroundColor - Background color to check against
 * @param preferDark - Prefer darker text colors when possible
 * @returns Best palette number for accessible text, or null if none found
 */
export function findAccessibleTextColor(
  paletteColor: string,
  backgroundColor: string,
  preferDark = true
): ColorPaletteNumber | null {
  const palette = generateOklchPalette(paletteColor);

  // Sort by lightness (darker first if preferDark, lighter first otherwise)
  const sortedPalettes = [...palette.palettes].sort((a, b) => {
    const aL = toOklch(a.hex)?.l ?? 0.5;
    const bL = toOklch(b.hex)?.l ?? 0.5;
    return preferDark ? aL - bL : bL - aL;
  });

  for (const { hex, number } of sortedPalettes) {
    const ratio = getContrastRatio(hex, backgroundColor);
    if (meetsWcagContrast(ratio)) {
      return number;
    }
  }

  return null;
}
