import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'system';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system';
    return (localStorage.getItem('theme') as Theme) || 'system';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('theme-transitioning');

    const applyTheme = (newTheme: 'light' | 'dark') => {
      // Add transitioning class to enable smooth transitions
      root.classList.add('theme-transitioning');

      // Remove existing theme classes
      root.classList.remove('light', 'dark');

      // Add new theme class
      root.classList.add(newTheme);

      // Remove transitioning class after transition completes
      setTimeout(() => {
        root.classList.remove('theme-transitioning');
      }, 200);
    };

    if (theme === 'system') {
      applyTheme(getSystemTheme());
    } else {
      applyTheme(theme);
    }

    localStorage.setItem('theme', theme);
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      const handler = () => {
        const root = window.document.documentElement;
        const systemTheme = getSystemTheme();
        root.classList.remove('light', 'dark');
        root.classList.add(systemTheme);
      };

      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [theme]);

  return {
    theme,
    setTheme: setThemeState,
  };
}