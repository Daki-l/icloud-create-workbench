/**
 * Semantic color tokens shared across web / native / miniapp.
 *
 * Names align with the Web `tailwind-plugin` CSS-var keys and the Native `theme/tokens/colors` palette.
 */
export type SemanticColorName =
  | 'accent'
  | 'carbon'
  | 'destructive'
  | 'info'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning';

/** Surface / structural color names (independent of brand palette). */
export type SurfaceColorName = 'background' | 'border' | 'card' | 'foreground' | 'input' | 'muted' | 'popover' | 'ring';

export type ColorTokenName = SemanticColorName | SurfaceColorName;

/**
 * Default brand-color hex values for both light & dark themes; consumers may override.
 *
 * Structure mirrors `defaultFeedbackColorsHsl` / `defaultSidebarColorsHsl` for symmetry.
 */
export const defaultBrandColors: { dark: Record<SemanticColorName, string>; light: Record<SemanticColorName, string> } =
  {
    dark: {
      accent: '#a78bfa',
      carbon: '#a1a1aa',
      destructive: '#f87171',
      info: '#60a5fa',
      primary: '#818cf8',
      secondary: '#94a3b8',
      success: '#4ade80',
      warning: '#fbbf24'
    },
    light: {
      accent: '#8b5cf6',
      carbon: '#71717a',
      destructive: '#ef4444',
      info: '#3b82f6',
      primary: '#6366f1',
      secondary: '#64748b',
      success: '#22c55e',
      warning: '#f59e0b'
    }
  };

/**
 * @deprecated Use `defaultBrandColors.light` instead. Will be removed in the next major.
 */
export const defaultLightColors: Record<SemanticColorName, string> = defaultBrandColors.light;

/**
 * @deprecated Use `defaultBrandColors.dark` instead. Will be removed in the next major.
 */
export const defaultDarkColors: Record<SemanticColorName, string> = defaultBrandColors.dark;

/**
 * Default feedback color values in HSL string form (compatible with the Web `tailwind-plugin`).
 *
 * These mirror the hex values above and are mainly for keeping web's CSS-var generation in sync.
 */
export const defaultFeedbackColorsHsl = {
  dark: {
    carbon: '220 14.3% 95.9%',
    'carbon-foreground': '220.9 39.3% 11%',
    info: '215 100% 54%',
    'info-foreground': '0 0% 100%',
    success: '140 79% 45%',
    'success-foreground': '0 0% 100%',
    warning: '37 91% 55%',
    'warning-foreground': '0 0% 100%'
  },
  light: {
    carbon: '240 4% 16%',
    'carbon-foreground': '0 0% 98%',
    info: '215 100% 54%',
    'info-foreground': '0 0% 100%',
    success: '140 79% 45%',
    'success-foreground': '0 0% 100%',
    warning: '37 91% 55%',
    'warning-foreground': '0 0% 100%'
  }
} as const;

/**
 * Default sidebar color values in HSL string form (compatible with the Web `tailwind-plugin`).
 *
 * Mirrors the structure of `defaultFeedbackColorsHsl`. Consumers may override individual keys
 * via the `sidebar` option of the tailwind plugin.
 */
export const defaultSidebarColorsHsl = {
  dark: {
    'sidebar-accent': '240 3.7% 15.9%',
    'sidebar-accent-foreground': '240 4.8% 95.9%',
    'sidebar-background': '240 5.9% 10%',
    'sidebar-border': '240 3.7% 15.9%',
    'sidebar-foreground': '240 4.8% 95.9%',
    'sidebar-primary': '236.9 100% 69.61%',
    'sidebar-primary-foreground': '0 0% 100%',
    'sidebar-ring': '217.2 91.2% 59.8%'
  },
  light: {
    'sidebar-accent': '240 4.8% 95.9%',
    'sidebar-accent-foreground': '240 5.9% 10%',
    'sidebar-background': '0 0% 98%',
    'sidebar-border': '220 13% 91%',
    'sidebar-foreground': '240 5.3% 26.1%',
    'sidebar-primary': '236.9 100% 69.61%',
    'sidebar-primary-foreground': '0 0% 98%',
    'sidebar-ring': '217.2 91.2% 59.8%'
  }
} as const;
