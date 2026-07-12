import { generateCSSVars, generateGlobalStyles } from './generate';
import type { SkyrocUIPluginOptions } from './types';

export function skyrocUITheme(options: SkyrocUIPluginOptions) {
  const { globals = true, platform = 'web', ...theme } = options;

  const isNative = platform === 'native';

  const cssVars = generateCSSVars(theme || {}, true, isNative);

  const baseStyles = globals ? generateGlobalStyles(isNative) : '';

  return {
    ...cssVars,
    ...baseStyles,
    '@keyframes shadcn-collapsible-down': {
      from: { height: '0' },
      to: { height: 'var(--radix-collapsible-content-height)' }
    },
    '@keyframes shadcn-collapsible-up': {
      from: { height: 'var(--radix-collapsible-content-height)' },
      to: { height: '0' }
    },
    '@keyframes shadcn-down': {
      from: { height: '0' },
      to: { height: 'var(--radix-accordion-content-height)' }
    },
    '@keyframes shadcn-up': {
      from: { height: 'var(--radix-accordion-content-height)' },
      to: { height: '0' }
    },
    'html.size-2xl': {
      fontSize: '24px'
    },
    'html.size-lg': {
      fontSize: '18px'
    },
    'html.size-md': {
      fontSize: '16px'
    },
    'html.size-sm': {
      fontSize: '14px'
    },
    'html.size-xl': {
      fontSize: '20px'
    },
    'html.size-xs': {
      fontSize: '12px'
    }
  };
}
