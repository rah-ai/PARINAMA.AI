/* ════════════════════════════════════════════════
   PARINAMA — ThemeToggle Component
   Sun/Moon toggle with rotation animation
   ════════════════════════════════════════════════ */

import { motion, AnimatePresence } from 'framer-motion';
import { useThemeContext } from '../../context/ThemeContext';

/* ── Sun Icon ────────────────────────────────── */

function SunIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

/* ── Moon Icon ───────────────────────────────── */

function MoonIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

/* ── Animation Variants ──────────────────────── */

const iconVariants = {
  initial: {
    scale: 0.5,
    rotate: -90,
    opacity: 0,
  },
  animate: {
    scale: 1,
    rotate: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
      duration: 0.4,
    },
  },
  exit: {
    scale: 0.5,
    rotate: 90,
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: 'easeIn',
    },
  },
};

const buttonVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.08 },
  tap: { scale: 0.92 },
};

/* ── ThemeToggle Component ───────────────────── */

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme, isDark } = useThemeContext();

  return (
    <motion.button
      className={`theme-toggle ${className}`}
      onClick={toggleTheme}
      variants={buttonVariants}
      initial="rest"
      whileHover="hover"
      whileTap="tap"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '40px',
        height: '40px',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        backgroundColor: 'var(--bg-card)',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'border-color 200ms ease, background-color 200ms ease',
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.span
            key="moon"
            variants={iconVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-amber)',
            }}
          >
            <MoonIcon />
          </motion.span>
        ) : (
          <motion.span
            key="sun"
            variants={iconVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-amber)',
            }}
          >
            <SunIcon />
          </motion.span>
        )}
      </AnimatePresence>

      {/* Subtle glow ring on hover */}
      <motion.div
        style={{
          position: 'absolute',
          inset: '-1px',
          borderRadius: '8px',
          border: '1px solid transparent',
          pointerEvents: 'none',
        }}
        whileHover={{
          borderColor: 'var(--accent-amber)',
          boxShadow: '0 0 12px rgba(217, 119, 6, 0.15)',
        }}
        transition={{ duration: 0.2 }}
      />
    </motion.button>
  );
}
