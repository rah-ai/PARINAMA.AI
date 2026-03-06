// ════════════════════════════════════════════════
// PARINAMA — Theme Context
// Dark/Light mode with smooth CSS variable transitions
// ════════════════════════════════════════════════

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// ── Theme Definitions ────────────────────────

const themes = {
  dark: {
    name: 'dark',
    label: 'Dark Mode',
    vars: {
      '--bg-primary': '#0D0C0A',
      '--bg-surface': '#161410',
      '--bg-card': '#1E1B17',
      '--bg-elevated': '#252119',
      '--text-primary': '#EAE2D6',
      '--text-secondary': '#A8957E',
      '--text-muted': '#6B5A47',
      '--accent-amber': '#D4922A',
      '--accent-green': '#5C8B4A',
      '--accent-rose': '#B85450',
      '--border': '#2C2720',
      '--shadow': 'rgba(0,0,0,0.7)',
      '--score-low': '#B85450',
      '--score-mid': '#D4922A',
      '--score-high': '#5C8B4A',
      '--overlay': 'rgba(13,12,10,0.85)',
    },
  },
  light: {
    name: 'light',
    label: 'Light Mode',
    vars: {
      '--bg-primary': '#F7F2EA',
      '--bg-surface': '#EEE7D9',
      '--bg-card': '#E6DECE',
      '--bg-elevated': '#DDD5C3',
      '--text-primary': '#1A1510',
      '--text-secondary': '#5C4A32',
      '--text-muted': '#9C8468',
      '--accent-amber': '#B8760E',
      '--accent-green': '#3D6B2C',
      '--accent-rose': '#943530',
      '--border': '#CEC5B0',
      '--shadow': 'rgba(0,0,0,0.1)',
      '--score-low': '#943530',
      '--score-mid': '#B8760E',
      '--score-high': '#3D6B2C',
      '--overlay': 'rgba(247,242,234,0.85)',
    },
  },
};

// ── Local Storage Key ────────────────────────

const THEME_STORAGE_KEY = 'parinama-theme';

// ── Context ──────────────────────────────────

const ThemeContext = createContext({
  theme: 'dark',
  isDark: true,
  toggleTheme: () => {},
  setTheme: () => {},
});

// ── Provider Component ───────────────────────

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    // Read from localStorage, default to dark
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored && themes[stored]) {
        return stored;
      }
      // Check system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
      }
    }
    return 'dark';
  });

  const isDark = theme === 'dark';

  // Apply CSS variables to document root
  const applyTheme = useCallback((themeName) => {
    const themeConfig = themes[themeName];
    if (!themeConfig) return;

    const root = document.documentElement;

    // Set all CSS variables
    Object.entries(themeConfig.vars).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });

    // Set data attribute for CSS selectors
    root.setAttribute('data-theme', themeName);

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', themeConfig.vars['--bg-primary']);
    }
  }, []);

  // Apply theme on mount and when it changes
  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme, applyTheme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e) => {
      // Only auto-switch if user hasn't manually set a preference
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (!stored) {
        setThemeState(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const setTheme = useCallback((themeName) => {
    if (themes[themeName]) {
      setThemeState(themeName);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = {
    theme,
    isDark,
    toggleTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;
