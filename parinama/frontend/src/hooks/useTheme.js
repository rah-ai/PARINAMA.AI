/* ════════════════════════════════════════════════
   PARINAMA — useTheme Hook
   Convenience hook wrapping ThemeContext with
   computed helpers for theme-aware components
   ════════════════════════════════════════════════ */

import { useContext, useMemo, useCallback } from 'react';
import { ThemeContext } from '../context/ThemeContext';

/* ── Design Tokens ───────────────────────────── */

const PALETTE = {
  dark: {
    bg: '#0c0a09',
    bgSurface: '#1c1917',
    bgElevated: '#292524',
    border: '#44403c',
    borderSubtle: '#292524',
    textPrimary: '#fafaf9',
    textSecondary: '#a8a29e',
    textMuted: '#78716c',
    accentAmber: '#d97706',
    accentAmberHover: '#f59e0b',
    accentGreen: '#22c55e',
    accentRose: '#e11d48',
    accentTerracotta: '#c2410c',
    shadow: 'rgba(0, 0, 0, 0.4)',
    overlay: 'rgba(12, 10, 9, 0.75)',
  },
  light: {
    bg: '#fafaf9',
    bgSurface: '#f5f5f4',
    bgElevated: '#ffffff',
    border: '#d6d3d1',
    borderSubtle: '#e7e5e4',
    textPrimary: '#1c1917',
    textSecondary: '#57534e',
    textMuted: '#a8a29e',
    accentAmber: '#b45309',
    accentAmberHover: '#d97706',
    accentGreen: '#16a34a',
    accentRose: '#be123c',
    accentTerracotta: '#9a3412',
    shadow: 'rgba(0, 0, 0, 0.08)',
    overlay: 'rgba(250, 250, 249, 0.75)',
  },
};

/* ══════════════════════════════════════════════
   HOOK — useTheme
   ══════════════════════════════════════════════ */

export default function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  const { theme, toggleTheme } = context;
  const isDark = theme === 'dark';

  /* ── Current palette ───────────────────────── */
  const colors = useMemo(() => PALETTE[theme] || PALETTE.dark, [theme]);

  /* ── Conditional style helper ──────────────── */
  const themed = useCallback(
    (darkValue, lightValue) => (isDark ? darkValue : lightValue),
    [isDark]
  );

  /* ── CSS variable getter ───────────────────── */
  const cssVar = useCallback((varName) => {
    if (typeof window === 'undefined') return '';
    return getComputedStyle(document.documentElement)
      .getPropertyValue(varName)
      .trim();
  }, []);

  /* ── Surface style presets ─────────────────── */
  const surfaces = useMemo(() => ({
    card: {
      backgroundColor: colors.bgSurface,
      border: `1px solid ${colors.border}`,
      borderRadius: '8px',
    },
    elevated: {
      backgroundColor: colors.bgElevated,
      border: `1px solid ${colors.border}`,
      borderRadius: '8px',
      boxShadow: `0 2px 8px ${colors.shadow}`,
    },
    overlay: {
      backgroundColor: colors.overlay,
      backdropFilter: 'blur(8px)',
    },
    input: {
      backgroundColor: colors.bg,
      border: `1px solid ${colors.borderSubtle}`,
      borderRadius: '6px',
      color: colors.textPrimary,
    },
  }), [colors]);

  /* ── Text style presets ────────────────────── */
  const text = useMemo(() => ({
    primary: { color: colors.textPrimary },
    secondary: { color: colors.textSecondary },
    muted: { color: colors.textMuted },
    accent: { color: colors.accentAmber },
    success: { color: colors.accentGreen },
    error: { color: colors.accentRose },
  }), [colors]);

  /* ── Transition helper for theme changes ───── */
  const themeTransition = useMemo(() => ({
    transition: 'background-color 300ms ease, color 300ms ease, border-color 300ms ease',
  }), []);

  return {
    /* Core */
    theme,
    isDark,
    toggleTheme,

    /* Palette */
    colors,

    /* Helpers */
    themed,
    cssVar,

    /* Presets */
    surfaces,
    text,
    themeTransition,
  };
}

export { PALETTE };
