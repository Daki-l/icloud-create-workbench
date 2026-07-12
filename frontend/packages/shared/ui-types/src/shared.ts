import type { ClassValue } from 'clsx';

// ==================== Theme Types ====================

/** Theme color variants */
export type ThemeColor = 'accent' | 'carbon' | 'destructive' | 'info' | 'primary' | 'secondary' | 'success' | 'warning';

/** Theme size variants */
export type ThemeSize = '2xl' | 'lg' | 'md' | 'sm' | 'xl' | 'xs';

/** Theme orientation */
export type ThemeOrientation = 'horizontal' | 'vertical';

/** Theme alignment */
export type ThemeAlign = 'center' | 'end' | 'start';

/** Theme side position */
export type ThemeSide = 'bottom' | 'left' | 'right' | 'top';

// ==================== Component Props ====================

/** Props with className support */
export interface WithClassName {
  /** CSS class name */
  className?: ClassValue;
}

/** Props with value support */
export type Value = string;

/** Utility type that accepts a single value or an array */
export type MaybeArray<T> = T | Array<T>;

// ==================== Utility Types ====================

/** Acceptable value types for form inputs and data */
export type AcceptableValue = bigint | number | string | Record<string, any> | null;

/** Re-export ClassValue from clsx */
export type { ClassValue };
