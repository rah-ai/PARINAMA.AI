/* ════════════════════════════════════════════════
   PARINAMA — Tailwind CSS Configuration
   Design tokens, custom theme, typography, animations
   ════════════════════════════════════════════════ */

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],

  darkMode: ['class', '[data-theme="dark"]'],

  theme: {
    extend: {
      /* ── Colors — Warm / Earthy Palette ────── */
      colors: {
        stone: {
          950: '#0c0a09',
          900: '#1c1917',
          850: '#292524',
          800: '#44403c',
          700: '#57534e',
          600: '#78716c',
          500: '#a8a29e',
          400: '#d6d3d1',
          300: '#e7e5e4',
          200: '#f5f5f4',
          100: '#fafaf9',
        },
        amber: {
          DEFAULT: '#d97706',
          light: '#f59e0b',
          dark: '#b45309',
          50: 'rgba(217, 119, 6, 0.08)',
          100: 'rgba(217, 119, 6, 0.15)',
        },
        terracotta: {
          DEFAULT: '#c2410c',
          light: '#ea580c',
          dark: '#9a3412',
        },
        parinama: {
          green: '#22c55e',
          'green-dark': '#16a34a',
          rose: '#e11d48',
          'rose-dark': '#be123c',
        },
      },

      /* ── Typography ────────────────────────── */
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"DM Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },

      fontSize: {
        'display-xl': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-lg': ['2.25rem', { lineHeight: '1.15', letterSpacing: '-0.015em', fontWeight: '600' }],
        'display-md': ['1.5rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' }],
        'display-sm': ['1.125rem', { lineHeight: '1.3', letterSpacing: '-0.005em', fontWeight: '600' }],
        'score': ['2rem', { lineHeight: '1', fontWeight: '700', fontFamily: '"DM Mono"' }],
        'score-sm': ['1.25rem', { lineHeight: '1', fontWeight: '600', fontFamily: '"DM Mono"' }],
        'label': ['0.6875rem', { lineHeight: '1', letterSpacing: '0.06em', fontWeight: '500' }],
      },

      /* ── Spacing ───────────────────────────── */
      spacing: {
        '4.5': '1.125rem',
        '13': '3.25rem',
        '15': '3.75rem',
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
      },

      /* ── Border Radius ─────────────────────── */
      borderRadius: {
        DEFAULT: '6px',
        'card': '8px',
        'badge': '9999px',
      },

      /* ── Box Shadow ────────────────────────── */
      boxShadow: {
        'card': '0 1px 3px rgba(0, 0, 0, 0.12)',
        'elevated': '0 4px 12px rgba(0, 0, 0, 0.15)',
        'glow-amber': '0 0 20px rgba(217, 119, 6, 0.15)',
        'glow-green': '0 0 20px rgba(34, 197, 94, 0.15)',
        'glow-rose': '0 0 12px rgba(225, 29, 72, 0.12)',
      },

      /* ── Animations ────────────────────────── */
      animation: {
        'dna-spin': 'dna-helix 3s ease-in-out infinite',
        'typewriter': 'typewriter-blink 1s step-end infinite',
        'grain': 'grain 0.5s steps(1) infinite',
        'pulse-ring': 'pulse-ring 2s ease-out infinite',
        'score-ring': 'score-ring-fill 1.2s ease-out forwards',
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-up': 'fade-in-up 0.4s ease-out',
        'shimmer': 'shimmer 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
      },

      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%, 100%': { backgroundPosition: '-200% center' },
          '50%': { backgroundPosition: '200% center' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },

      /* ── Transitions ───────────────────────── */
      transitionDuration: {
        DEFAULT: '200ms',
        'theme': '300ms',
      },

      transitionTimingFunction: {
        'ease-spring': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },

      /* ── Z-Index ───────────────────────────── */
      zIndex: {
        'navbar': '40',
        'overlay': '50',
        'modal': '60',
        'tooltip': '70',
        'grain': '9999',
      },

      /* ── Max Width ─────────────────────────── */
      maxWidth: {
        'prompt': '720px',
        'content': '1100px',
      },
    },
  },

  plugins: [],
};
