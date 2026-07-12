import { useEffect, useState } from 'react';

export type ThemeName = 'dark' | 'light';

/**
 * Hook to detect system color scheme preference
 *
 * Uses the `prefers-color-scheme` media query to detect whether the user prefers dark or light mode
 */
export function useSystemTheme() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const themeName = isDarkMode ? 'dark' : 'light';

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    function handleChange(e: MediaQueryListEvent) {
      setIsDarkMode(e.matches);
    }

    setIsDarkMode(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return { isDarkMode, isLightMode: !isDarkMode, themeName };
}
