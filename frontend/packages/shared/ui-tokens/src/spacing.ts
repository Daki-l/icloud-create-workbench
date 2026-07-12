/**
 * Spacing scale aligned with Tailwind defaults (4px base unit).
 *
 * Cross-platform: web (Tailwind) consumes px strings, native (NativeWind) consumes numeric pixel values via the same key.
 */
export const spacing = {
  0: '0px',
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  2.5: '10px',
  3: '12px',
  3.5: '14px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  9: '36px',
  10: '40px',
  11: '44px',
  12: '48px',
  14: '56px',
  16: '64px',
  20: '80px',
  24: '96px',
  28: '112px',
  32: '128px'
} as const;

export type SpacingToken = keyof typeof spacing;
