/* ════════════════════════════════════════════════
   PARINAMA — App.jsx
   Main application shell: layout composition,
   phase-based view switching, animation orchestration
   ════════════════════════════════════════════════ */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Hooks ───────────────────────────────────── */
import useEvolution, { EvolutionPhase } from './hooks/useEvolution';
import useTheme from './hooks/useTheme';

/* ── Layout Components ───────────────────────── */
import Navbar from './components/ui/Navbar';
import ThemeToggle from './components/ui/ThemeToggle';
import { FullPageDNA } from './components/ui/LoadingDNA';

/* ── Landing ─────────────────────────────────── */
import HeroSection from './components/landing/HeroSection';
import PromptInput from './components/landing/PromptInput';

/* ── Evolution ───────────────────────────────── */
import StreamingText from './components/evolution/StreamingText';
import { MutationBadgeWithReason } from './components/evolution/MutationBadge';
import ScoreRadar from './components/evolution/ScoreRadar';
import { GenerationTimeline } from './components/evolution/GenerationCard';
import EvolutionTree from './components/evolution/EvolutionTree';

/* ── Results ─────────────────────────────────── */
import ScoreTimeline from './components/results/ScoreTimeline';
import FinalPrompt from './components/results/FinalPrompt';
import ExportPanel from './components/results/ExportPanel';

/* ── History ──────────────────────────────────── */
import HistoryView from './components/history/HistoryView';

/* ── About ────────────────────────────────────── */
import AboutView from './components/about/AboutView';

/* ── Styles ──────────────────────────────────── */
import './styles/globals.css';
import './styles/themes.css';
import './styles/animations.css';

/* ══════════════════════════════════════════════
   VIEW — Landing (idle state)
   ══════════════════════════════════════════════ */

function LandingView({ onStartEvolution }) {
  return (
    <motion.div
      key="landing"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.5 }}
      style={{ width: '100%' }}
    >
      <HeroSection />
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0 1.5rem 4rem' }}>
        <PromptInput onStartEvolution={onStartEvolution} />
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════
   VIEW — Evolution (in-progress)
   ══════════════════════════════════════════════ */

function EvolutionView({
  phase,
  originalPrompt,
  streamingText,
  currentMutation,
  currentProvider,
  originalScores,
  currentScores,
  currentGeneration,
  totalGenerations,
  generations,
  progressPercent,
  onCancel,
}) {
  return (
    <motion.div
      key="evolution"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.5 }}
      style={{
        width: '100%',
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '2rem 1.5rem 4rem',
      }}
    >
      {/* Phase Header */}
      <motion.div
        layout
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div>
          <h2
            className="text-display"
            style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}
          >
            {phase === EvolutionPhase.SCORING && 'Analyzing prompt…'}
            {phase === EvolutionPhase.MUTATING && 'Planning mutation…'}
            {phase === EvolutionPhase.EVOLVING && 'Evolving…'}
            {phase === EvolutionPhase.STREAMING && 'Generating…'}
            {phase === EvolutionPhase.CONNECTING && 'Connecting…'}
          </h2>
          <p className="text-body" style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
            Generation {currentGeneration} of {totalGenerations}
            {currentProvider && ` · via ${currentProvider}`}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Progress bar */}
          <div
            style={{
              width: '120px',
              height: '4px',
              borderRadius: '2px',
              backgroundColor: 'var(--border)',
              overflow: 'hidden',
            }}
          >
            <motion.div
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              style={{
                height: '100%',
                backgroundColor: 'var(--accent-amber)',
                borderRadius: '2px',
              }}
            />
          </div>

          {/* Cancel button */}
          <motion.button
            onClick={onCancel}
            whileHover={{ borderColor: 'var(--accent-rose)' }}
            whileTap={{ scale: 0.96 }}
            style={{
              padding: '0.375rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              backgroundColor: 'transparent',
              color: 'var(--text-muted)',
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            Cancel
          </motion.button>
        </div>
      </motion.div>

      {/* Two-column layout */}
      <div
        className="evolution-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        {/* Left — Streaming + Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Current mutation badge */}
          {currentMutation?.type && (
            <MutationBadgeWithReason
              type={currentMutation.type}
              reason={currentMutation.reason}
              isActive
            />
          )}

          {/* Streaming text */}
          {(phase === EvolutionPhase.STREAMING || phase === EvolutionPhase.EVOLVING) && (
            <StreamingText
              text={streamingText}
              isStreaming={phase === EvolutionPhase.STREAMING}
              previousText={generations.length > 1
                ? generations[generations.length - 2]?.prompt
                : originalPrompt
              }
            />
          )}

          {/* Generation timeline */}
          {generations.length > 0 && (
            <GenerationTimeline generations={generations} />
          )}
        </div>

        {/* Right — Score radar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <ScoreRadar
            scores={currentScores}
            previousScores={originalScores}
            size={280}
          />

          {/* Loading DNA for mutation/scoring phases */}
          {(phase === EvolutionPhase.SCORING || phase === EvolutionPhase.MUTATING) && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0' }}>
              <FullPageDNA />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════
   VIEW — Results (completed)
   ══════════════════════════════════════════════ */

function ResultsView({
  sessionId,
  originalPrompt,
  evolvedPrompt,
  originalScores,
  currentScores,
  generations,
  totalGenerations,
  bestGeneration,
  onReset,
  onViewHistory,
}) {
  return (
    <motion.div
      key="results"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      style={{
        width: '100%',
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '2rem 1.5rem 4rem',
      }}
    >
      {/* Final Prompt */}
      <FinalPrompt
        originalPrompt={originalPrompt}
        evolvedPrompt={evolvedPrompt}
        originalScores={originalScores}
        finalScores={currentScores}
        totalGenerations={totalGenerations}
        bestGeneration={bestGeneration}
        sessionId={sessionId}
        onStartNew={onReset}
        onViewHistory={onViewHistory}
      />

      {/* Score Timeline Chart */}
      {generations.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          style={{ marginTop: '2rem' }}
        >
          <h3
            className="text-display"
            style={{ fontSize: '1.125rem', marginBottom: '0.75rem' }}
          >
            Score Evolution
          </h3>
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '1.25rem',
            }}
          >
            <ScoreTimeline generations={generations} />
          </div>
        </motion.div>
      )}

      {/* Two-column: Tree + Radar */}
      <div
        className="results-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1.5rem',
          marginTop: '2rem',
        }}
      >
        {/* Evolution Tree */}
        {generations.length > 1 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <h3
              className="text-display"
              style={{ fontSize: '1.125rem', marginBottom: '0.75rem' }}
            >
              Evolution Tree
            </h3>
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '1rem',
              }}
            >
              <EvolutionTree generations={generations} height={160} />
            </div>
          </motion.div>
        )}

        {/* Final Radar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <h3
            className="text-display"
            style={{ fontSize: '1.125rem', marginBottom: '0.75rem' }}
          >
            Score Comparison
          </h3>
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '1.25rem',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <ScoreRadar
              scores={currentScores}
              previousScores={originalScores}
              size={280}
            />
          </div>
        </motion.div>
      </div>

      {/* Export Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        style={{ marginTop: '1.5rem', maxWidth: '480px', margin: '1.5rem auto 0' }}
      >
        <ExportPanel
          sessionId={sessionId}
          originalPrompt={originalPrompt}
          evolvedPrompt={evolvedPrompt}
          originalScores={originalScores}
          finalScores={currentScores}
          totalGenerations={totalGenerations}
          bestGeneration={bestGeneration}
          generations={generations}
        />
      </motion.div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════
   VIEW — Error
   ══════════════════════════════════════════════ */

function ErrorView({ error, onRetry, onReset }) {
  return (
    <motion.div
      key="error"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        maxWidth: '520px',
        margin: '6rem auto',
        padding: '2.5rem',
        textAlign: 'center',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--accent-rose)',
        borderRadius: '8px',
      }}
    >
      <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⚠</div>
      <h2
        className="text-display"
        style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}
      >
        Evolution Failed
      </h2>
      <p className="text-body" style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        {error || 'An unexpected error occurred during evolution.'}
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
        <motion.button
          onClick={onRetry}
          whileHover={{ borderColor: 'var(--accent-amber)' }}
          whileTap={{ scale: 0.97 }}
          style={{
            padding: '0.5rem 1.25rem',
            borderRadius: '6px',
            border: '1px solid var(--accent-amber)',
            backgroundColor: 'transparent',
            color: 'var(--accent-amber)',
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.8125rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Retry
        </motion.button>
        <motion.button
          onClick={onReset}
          whileHover={{ borderColor: 'var(--text-secondary)' }}
          whileTap={{ scale: 0.97 }}
          style={{
            padding: '0.5rem 1.25rem',
            borderRadius: '6px',
            border: '1px solid var(--border)',
            backgroundColor: 'transparent',
            color: 'var(--text-muted)',
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.8125rem',
            cursor: 'pointer',
          }}
        >
          Start Over
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════
   FOOTER — Startup-style footer
   ══════════════════════════════════════════════ */

const EVOLUTION_QUOTES = [
  '"It is not the strongest that survives, but the most adaptable." — Darwin',
  '"Every prompt is a seed. Evolution is the garden."',
  '"Perfection is not when there is nothing to add, but nothing to take away."',
  '"The best prompt is one that has survived mutation."',
  '"Small changes, compounded over generations, create breakthroughs."',
  '"Your prompt today is the ancestor of tomorrow\'s masterpiece."',
  '"In the arena of AI, the well-crafted prompt is king."',
];

function Footer({ goToHistory, goToAbout, goHome }) {
  const [quoteIdx, setQuoteIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIdx((prev) => (prev + 1) % EVOLUTION_QUOTES.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const footerLink = (label, action) => (
    <button
      onClick={action}
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        fontFamily: "'Inter', sans-serif",
        fontSize: '0.8125rem',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        transition: 'color 150ms ease',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-amber)')}
      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
    >
      {label}
    </button>
  );

  return (
    <footer
      style={{
        width: '100%',
        padding: '2.5rem 2rem 2rem',
        borderTop: '1px solid var(--border)',
        backgroundColor: 'var(--bg-primary)',
        marginTop: 'auto',
      }}
    >
      <div
        style={{
          maxWidth: '960px',
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '2rem',
        }}
      >
        {/* Brand column */}
        <div style={{ minWidth: '200px', maxWidth: '320px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em',
              }}
            >
              PARINAMA
            </span>
            <span
              style={{
                fontSize: '0.625rem',
                fontFamily: "'DM Mono', monospace",
                padding: '0.125rem 0.375rem',
                borderRadius: '3px',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
                lineHeight: 1,
              }}
            >
              beta
            </span>
          </div>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Self-evolving prompt optimization engine.
            Powered by evolutionary algorithms &amp; LLMs.
          </p>
        </div>

        {/* Navigate column */}
        <div style={{ minWidth: '100px' }}>
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: '0.6875rem',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '0.625rem',
              marginTop: 0,
            }}
          >
            Navigate
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <li>{footerLink('Home', goHome)}</li>
            <li>{footerLink('History', goToHistory)}</li>
            <li>{footerLink('About', goToAbout)}</li>
          </ul>
        </div>

        {/* Contact column */}
        <div style={{ minWidth: '140px' }}>
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: '0.6875rem',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '0.625rem',
              marginTop: 0,
            }}
          >
            Contact
          </p>
          <a
            href="mailto:parinama.ai@gmail.com"
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              transition: 'color 150ms ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-amber)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            ✉ parinama.ai@gmail.com
          </a>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.6875rem',
              color: 'var(--text-muted)',
              margin: '0.375rem 0 0',
              lineHeight: 1.5,
            }}
          >
            Feedback &amp; queries welcome
          </p>
        </div>

        {/* Rotating quote column */}
        <div style={{ minWidth: '200px', maxWidth: '280px' }}>
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: '0.6875rem',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '0.625rem',
              marginTop: 0,
            }}
          >
            &#x2728; Evolution thought
          </p>
          <AnimatePresence mode="wait">
            <motion.p
              key={quoteIdx}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.5 }}
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.75rem',
                fontStyle: 'italic',
                color: 'var(--text-muted)',
                lineHeight: 1.6,
                margin: 0,
                minHeight: '2.4rem',
              }}
            >
              {EVOLUTION_QUOTES[quoteIdx]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        style={{
          maxWidth: '960px',
          margin: '1.75rem auto 0',
          paddingTop: '1.25rem',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            margin: 0,
          }}
        >
          &copy; {new Date().getFullYear()} PARINAMA &middot; Built by{' '}
          <span style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>
            Rahul Makwana
          </span>
        </p>
        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: '0.6875rem',
            color: 'var(--text-muted)',
            margin: 0,
            opacity: 0.6,
          }}
        >
          v1.0.0
        </p>
      </div>
    </footer>
  );
}

/* ══════════════════════════════════════════════
   MAIN — App Component
   ══════════════════════════════════════════════ */

export default function App() {
  const { theme } = useTheme();
  const evolution = useEvolution();
  const [showHistory, setShowHistory] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  const {
    phase,
    isEvolving,
    isConnected,
    error,
    sessionId,
    originalPrompt,
    evolvedPrompt,
    originalScores,
    currentScores,
    generations,
    currentGeneration,
    totalGenerations,
    bestGeneration,
    progressPercent,
    streamingText,
    currentMutation,
    currentProvider,
    startEvolution,
    cancelEvolution,
    reset,
  } = evolution;

  /* ── Determine active view ─────────────────── */
  const activeView = useMemo(() => {
    if (showAbout) return 'about';
    if (showHistory) return 'history';
    if (phase === EvolutionPhase.ERROR) return 'error';
    if (phase === EvolutionPhase.COMPLETED) return 'results';
    if (phase === EvolutionPhase.CANCELLED) return 'landing';
    if (isEvolving) return 'evolution';
    return 'landing';
  }, [phase, isEvolving, showHistory, showAbout]);

  /* ── Navigate to history ───────────────────── */
  const goToHistory = useCallback(() => { setShowAbout(false); setShowHistory(true); }, []);
  const goHome = useCallback(() => { setShowHistory(false); setShowAbout(false); }, []);
  const goToAbout = useCallback(() => { setShowHistory(false); setShowAbout(true); }, []);

  /* ── Set data-theme on root ────────────────── */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  /* ── Handle start ──────────────────────────── */
  const handleStart = (prompt, maxGenerations) => {
    setShowHistory(false);
    setShowAbout(false);
    startEvolution(prompt, maxGenerations);
  };

  /* ── Handle retry (re-evolve same prompt) ──── */
  const handleRetry = () => {
    if (originalPrompt) {
      startEvolution(originalPrompt, totalGenerations || 5);
    } else {
      reset();
    }
  };

  return (
    <div
      className="app-root"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg)',
        color: 'var(--text-primary)',
        transition: 'background-color 300ms ease, color 300ms ease',
      }}
    >
      {/* Navbar */}
      <Navbar
        currentProvider={currentProvider}
        isConnected={isConnected}
        isEvolving={isEvolving}
        currentGeneration={currentGeneration}
        totalGenerations={totalGenerations}
        activeView={activeView}
        onNavigate={(view) => {
          if (view === 'history') {
            goToHistory();
          } else if (view === 'about') {
            goToAbout();
          } else if (view === 'landing') {
            goHome();
            reset();
          }
        }}
      />

      {/* Theme toggle (fixed) */}
      <div
        style={{
          position: 'fixed',
          bottom: '1.25rem',
          right: '1.25rem',
          zIndex: 50,
        }}
      >
        <ThemeToggle />
      </div>

      {/* Main content — phase-switched views */}
      <main style={{ paddingTop: '4rem', flex: 1 }}>
        <AnimatePresence mode="wait">
          {activeView === 'landing' && (
            <LandingView
              onStartEvolution={handleStart}
            />
          )}

          {activeView === 'evolution' && (
            <EvolutionView
              phase={phase}
              originalPrompt={originalPrompt}
              streamingText={streamingText}
              currentMutation={currentMutation}
              currentProvider={currentProvider}
              originalScores={originalScores}
              currentScores={currentScores}
              currentGeneration={currentGeneration}
              totalGenerations={totalGenerations}
              generations={generations}
              progressPercent={progressPercent}
              onCancel={cancelEvolution}
            />
          )}

          {activeView === 'results' && (
            <ResultsView
              sessionId={sessionId}
              originalPrompt={originalPrompt}
              evolvedPrompt={evolvedPrompt}
              originalScores={originalScores}
              currentScores={currentScores}
              generations={generations}
              totalGenerations={totalGenerations}
              bestGeneration={bestGeneration}
              onReset={() => {
                reset();
                goHome();
              }}
              onViewHistory={goToHistory}
            />
          )}

          {activeView === 'history' && (
            <HistoryView
              onStartEvolution={handleStart}
            />
          )}

          {activeView === 'about' && (
            <AboutView />
          )}

          {activeView === 'error' && (
            <ErrorView
              error={error}
              onRetry={handleRetry}
              onReset={reset}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <Footer goToHistory={goToHistory} goToAbout={goToAbout} goHome={() => { goHome(); reset(); }} />

      {/* Film grain overlay */}
      <div
        className="grain-overlay"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 9999,
          opacity: 0.03,
        }}
      />
    </div>
  );
}
