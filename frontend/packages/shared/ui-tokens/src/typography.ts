/**
 * Font size scale.
 *
 * Tuple form `[size, { lineHeight }]` is compatible with both Tailwind and NativeWind.
 */
export const fontSize = {
  xs: ['12px', { lineHeight: '16px' }],
  sm: ['14px', { lineHeight: '20px' }],
  base: ['16px', { lineHeight: '24px' }],
  lg: ['18px', { lineHeight: '28px' }],
  xl: ['20px', { lineHeight: '28px' }],
  '2xl': ['24px', { lineHeight: '32px' }],
  '3xl': ['30px', { lineHeight: '36px' }],
  '4xl': ['36px', { lineHeight: '40px' }],
  '5xl': ['48px', { lineHeight: '1' }],
  '6xl': ['60px', { lineHeight: '1' }]
} as const;

export type FontSizeToken = keyof typeof fontSize;

/** Font weight scale aligned with Tailwind defaults. */
export const fontWeight = {
  thin: '100',
  extralight: '200',
  light: '300',
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
  black: '900'
} as const;

export type FontWeightToken = keyof typeof fontWeight;
