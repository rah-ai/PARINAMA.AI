/* ════════════════════════════════════════════════
   PARINAMA — Navbar Component
   Top navigation with logo, status, and controls
   ════════════════════════════════════════════════ */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from './ThemeToggle';
import useStore from '../../store/useStore';

/* ── Logo Mark ───────────────────────────────── */

function LogoMark() {
  return (
    <motion.svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      whileHover={{ rotate: 15 }}
      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
    >
      {/* Outer ring — evolution cycle */}
      <circle
        cx="14"
        cy="14"
        r="12"
        stroke="var(--accent-amber)"
        strokeWidth="1.5"
        fill="none"
        opacity="0.4"
      />
      {/* Inner seed — the prompt */}
      <circle
        cx="14"
        cy="14"
        r="4"
        fill="var(--accent-amber)"
        opacity="0.9"
      />
      {/* Growth rays */}
      <line x1="14" y1="2" x2="14" y2="7" stroke="var(--accent-amber)" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <line x1="14" y1="21" x2="14" y2="26" stroke="var(--accent-amber)" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <line x1="2" y1="14" x2="7" y2="14" stroke="var(--accent-amber)" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <line x1="21" y1="14" x2="26" y2="14" stroke="var(--accent-amber)" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      {/* Diagonal growth */}
      <line x1="5.5" y1="5.5" x2="8.5" y2="8.5" stroke="var(--accent-terracotta)" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <line x1="19.5" y1="19.5" x2="22.5" y2="22.5" stroke="var(--accent-terracotta)" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
    </motion.svg>
  );
}

/* ── Provider Status Dot ─────────────────────── */

function ProviderStatus() {
  const { currentLLM: currentProvider } = useStore();
  const [health, setHealth] = useState('unknown');

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = await res.json();
          setHealth(data.status === 'healthy' ? 'healthy' : 'degraded');
        } else {
          setHealth('error');
        }
      } catch {
        setHealth('error');
      }
    }

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const statusColors = {
    healthy: 'var(--accent-green)',
    degraded: 'var(--accent-amber)',
    error: 'var(--accent-rose)',
    unknown: 'var(--text-muted)',
  };

  const providerLabels = {
    groq: 'Groq',
    gemini: 'Gemini',
    ollama: 'Ollama',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.25rem 0.625rem',
        borderRadius: '4px',
        border: '1px solid var(--border)',
        backgroundColor: 'var(--bg-surface)',
        fontSize: '0.75rem',
        fontFamily: "'DM Mono', monospace",
        color: 'var(--text-muted)',
      }}
    >
      {/* Pulsing status dot */}
      <motion.span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: statusColors[health],
        }}
        animate={health === 'healthy' ? {
          boxShadow: [
            `0 0 0 0px ${statusColors[health]}40`,
            `0 0 0 4px ${statusColors[health]}00`,
          ],
        } : {}}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeOut',
        }}
      />
      <span>{providerLabels[currentProvider] || 'LLM'}</span>
    </motion.div>
  );
}

/* ── Session Counter ─────────────────────────── */

function SessionInfo() {
  const { currentScreen, isEvolving, currentGenerationNum, maxGenerations } = useStore();

  if (currentScreen !== 'evolving' || !isEvolving) return null;

  const gen = currentGenerationNum;
  const maxGen = maxGenerations;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.25rem 0.75rem',
          borderRadius: '4px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
        }}
      >
        {/* Mini progress bar */}
        <div
          style={{
            width: '48px',
            height: '3px',
            borderRadius: '2px',
            backgroundColor: 'var(--bg-surface)',
            overflow: 'hidden',
          }}
        >
          <motion.div
            style={{
              height: '100%',
              borderRadius: '2px',
              backgroundColor: 'var(--accent-amber)',
            }}
            initial={{ width: '0%' }}
            animate={{ width: `${maxGen > 0 ? (gen / maxGen) * 100 : 0}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>

        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
          }}
        >
          Gen {gen}/{maxGen}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}

/* ── Nav Links ───────────────────────────────── */

function NavLinks() {
  const { currentScreen, setScreen, isEvolving } = useStore();

  const links = [
    { id: 'landing', label: 'Home' },
    { id: 'history', label: 'History' },
  ];

  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
      }}
    >
      {links.map((link) => {
        const isActive = currentScreen === link.id;
        const isDisabled = isEvolving && link.id !== currentScreen;

        return (
          <motion.button
            key={link.id}
            onClick={() => !isDisabled && setScreen(link.id)}
            whileHover={!isDisabled ? { backgroundColor: 'var(--bg-card)' } : {}}
            whileTap={!isDisabled ? { scale: 0.97 } : {}}
            style={{
              padding: '0.375rem 0.75rem',
              borderRadius: '4px',
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.8125rem',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--accent-amber)' : 'var(--text-muted)',
              backgroundColor: isActive ? 'var(--bg-card)' : 'transparent',
              border: 'none',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              opacity: isDisabled ? 0.4 : 1,
              transition: 'color 200ms ease',
              position: 'relative',
            }}
            disabled={isDisabled}
          >
            {link.label}

            {/* Active indicator underline */}
            {isActive && (
              <motion.div
                layoutId="nav-underline"
                style={{
                  position: 'absolute',
                  bottom: '2px',
                  left: '25%',
                  right: '25%',
                  height: '2px',
                  borderRadius: '1px',
                  backgroundColor: 'var(--accent-amber)',
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </motion.button>
        );
      })}
    </nav>
  );
}

/* ── Main Navbar Component ───────────────────── */

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  /* Detect scroll for shadow */
  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 10);
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        width: '100%',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem',
        backgroundColor: scrolled
          ? 'var(--bg-primary)'
          : 'transparent',
        borderBottom: scrolled
          ? '1px solid var(--border)'
          : '1px solid transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        transition: 'background-color 300ms ease, border-color 300ms ease, backdrop-filter 300ms ease',
      }}
    >
      {/* Left section: Logo + Name */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <LogoMark />

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '1.125rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              lineHeight: 1.2,
              letterSpacing: '-0.01em',
            }}
          >
            PARINAMA
          </span>
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: '0.625rem',
              color: 'var(--text-muted)',
              lineHeight: 1,
              letterSpacing: '0.04em',
            }}
          >
            prompt evolution engine
          </span>
        </div>
      </div>

      {/* Center section: Nav + Session */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        <NavLinks />
        <SessionInfo />
      </div>

      {/* Right section: Provider + Theme */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <ProviderStatus />
        <ThemeToggle />
      </div>
    </motion.header>
  );
}
