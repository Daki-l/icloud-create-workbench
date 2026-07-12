/**
 * Border-radius scale shared across web / native / miniapp.
 *
 * Values are CSS px strings; consumers may convert to numeric for native if needed.
 */
export const borderRadius = {
  none: '0px',
  sm: '4px',
  DEFAULT: '8px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '24px',
  full: '9999px'
} as const;

export type RadiusToken = keyof typeof borderRadius;
