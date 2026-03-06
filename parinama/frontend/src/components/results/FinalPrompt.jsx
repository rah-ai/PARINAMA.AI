/* ════════════════════════════════════════════════
   PARINAMA — FinalPrompt Component
   Final evolved prompt display with copy & comparison
   ════════════════════════════════════════════════ */

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScoreRadarWithLegend } from '../evolution/ScoreRadar';

/* ── Copy Button ─────────────────────────────── */

function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Fallback for older browsers */
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  return (
    <motion.button
      onClick={handleCopy}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.375rem',
        padding: '0.4rem 0.75rem',
        borderRadius: '4px',
        border: `1px solid ${copied ? 'var(--accent-green)' : 'var(--border)'}`,
        backgroundColor: copied ? 'rgba(34, 197, 94, 0.08)' : 'var(--bg-surface)',
        color: copied ? 'var(--accent-green)' : 'var(--text-secondary)',
        fontFamily: "'Inter', sans-serif",
        fontSize: '0.75rem',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 200ms ease',
      }}
      aria-label={copied ? 'Copied!' : label}
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.span
            key="check"
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          >
            ✓
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            ⊡
          </motion.span>
        )}
      </AnimatePresence>
      {copied ? 'Copied!' : label}
    </motion.button>
  );
}

/* ── Prompt Display Block ────────────────────── */

function PromptBlock({ prompt, label, variant = 'default' }) {
  const isEvolved = variant === 'evolved';

  return (
    <div
      style={{
        borderRadius: '6px',
        border: `1px solid ${isEvolved ? 'var(--accent-amber)' : 'var(--border)'}`,
        backgroundColor: 'var(--bg-elevated)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.5rem 0.75rem',
          borderBottom: '1px solid var(--border)',
          backgroundColor: isEvolved
            ? 'rgba(217, 119, 6, 0.04)'
            : 'var(--bg-surface)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
          }}
        >
          {isEvolved && (
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-amber)' }}>✦</span>
          )}
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.6875rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: isEvolved ? 'var(--accent-amber)' : 'var(--text-muted)',
            }}
          >
            {label}
          </span>
        </div>

        <CopyButton text={prompt} label="Copy" />
      </div>

      {/* Prompt text */}
      <div
        style={{
          padding: '0.875rem',
          maxHeight: '240px',
          overflowY: 'auto',
        }}
      >
        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: '0.9375rem',
            lineHeight: 1.7,
            color: 'var(--text-primary)',
            margin: 0,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {prompt || 'No prompt available'}
        </p>
      </div>
    </div>
  );
}

/* ── Score Summary Strip ─────────────────────── */

function ScoreSummaryStrip({ originalScore, finalScore, generations, bestGeneration }) {
  const improvement = finalScore - originalScore;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4 }}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '0.75rem',
      }}
    >
      {/* Original Score */}
      <StatCard
        label="Original"
        value={originalScore}
        color="var(--text-muted)"
        delay={0.3}
      />

      {/* Final Score */}
      <StatCard
        label="Final"
        value={finalScore}
        color={getScoreColor(finalScore)}
        delay={0.4}
      />

      {/* Improvement */}
      <StatCard
        label="Improvement"
        value={`${improvement > 0 ? '+' : ''}${improvement}`}
        color={improvement > 0 ? 'var(--accent-green)' : improvement < 0 ? 'var(--accent-rose)' : 'var(--text-muted)'}
        delay={0.5}
      />

      {/* Generations */}
      <StatCard
        label="Generations"
        value={generations}
        color="var(--accent-amber)"
        delay={0.6}
      />
    </motion.div>
  );
}

/* ── Individual Stat Card ────────────────────── */

function StatCard({ label, value, color, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      style={{
        padding: '0.75rem',
        borderRadius: '6px',
        border: '1px solid var(--border)',
        backgroundColor: 'var(--bg-surface)',
        textAlign: 'center',
      }}
    >
      <span
        style={{
          display: 'block',
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.625rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--text-muted)',
          marginBottom: '0.25rem',
        }}
      >
        {label}
      </span>
      <motion.span
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: delay + 0.15, type: 'spring', stiffness: 300, damping: 20 }}
        style={{
          display: 'block',
          fontFamily: "'Playfair Display', serif",
          fontSize: '1.5rem',
          fontWeight: 700,
          color,
          lineHeight: 1.2,
        }}
      >
        {value}
      </motion.span>
    </motion.div>
  );
}

/* ── Score Color ──────────────────────────────── */

function getScoreColor(score) {
  if (score >= 80) return 'var(--accent-green)';
  if (score >= 60) return 'var(--accent-amber)';
  if (score >= 40) return 'var(--accent-terracotta)';
  return 'var(--accent-rose)';
}

/* ── Tab Switcher ────────────────────────────── */

function TabSwitcher({ tabs, activeTab, onTabChange }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '0.25rem',
        padding: '0.25rem',
        borderRadius: '6px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
      }}
    >
      {tabs.map((tab) => (
        <motion.button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          whileTap={{ scale: 0.97 }}
          style={{
            padding: '0.375rem 0.75rem',
            borderRadius: '4px',
            border: 'none',
            backgroundColor: activeTab === tab.id ? 'var(--bg-card)' : 'transparent',
            color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.75rem',
            fontWeight: activeTab === tab.id ? 600 : 400,
            cursor: 'pointer',
            transition: 'all 200ms ease',
            position: 'relative',
          }}
        >
          {tab.label}
          {activeTab === tab.id && (
            <motion.div
              layoutId="tab-indicator"
              style={{
                position: 'absolute',
                bottom: '2px',
                left: '20%',
                right: '20%',
                height: '2px',
                borderRadius: '1px',
                backgroundColor: 'var(--accent-amber)',
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
        </motion.button>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN — FinalPrompt Component
   ══════════════════════════════════════════════ */

export default function FinalPrompt({
  originalPrompt = '',
  evolvedPrompt = '',
  originalScores = {},
  finalScores = {},
  totalGenerations = 0,
  bestGeneration = null,
  sessionId = null,
  onStartNew = null,
  onViewHistory = null,
  className = '',
  style: externalStyle = {},
}) {
  const [activeTab, setActiveTab] = useState('evolved');

  /* Overall scores */
  const calcOverall = useCallback((scores) => {
    const weights = { clarity: 0.25, specificity: 0.20, actionability: 0.20, conciseness: 0.20, creativity: 0.15 };
    let total = 0;
    Object.entries(weights).forEach(([key, weight]) => {
      total += (scores[key] ?? 0) * weight;
    });
    return Math.round(total);
  }, []);

  const originalOverall = useMemo(() => calcOverall(originalScores), [originalScores, calcOverall]);
  const finalOverall = useMemo(() => calcOverall(finalScores), [finalScores, calcOverall]);

  const tabs = [
    { id: 'evolved', label: 'Evolved Prompt' },
    { id: 'comparison', label: 'Comparison' },
    { id: 'analysis', label: 'Score Analysis' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`final-prompt ${className}`}
      style={{
        maxWidth: '800px',
        margin: '0 auto',
        ...externalStyle,
      }}
    >
      {/* ── Success Header ────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{
          textAlign: 'center',
          marginBottom: '1.5rem',
        }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 20 }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: 'rgba(217, 119, 6, 0.10)',
            border: '1px solid rgba(217, 119, 6, 0.25)',
            marginBottom: '0.75rem',
            fontSize: '1.25rem',
          }}
        >
          ✦
        </motion.div>

        <h2
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(1.25rem, 3vw, 1.75rem)',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: '0.375rem',
          }}
        >
          Evolution Complete
        </h2>

        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.875rem',
            color: 'var(--text-muted)',
          }}
        >
          Your prompt evolved through {totalGenerations} generation{totalGenerations !== 1 ? 's' : ''} of optimization
        </p>
      </motion.div>

      {/* ── Score Summary ─────────────────────── */}
      <div style={{ marginBottom: '1.25rem' }}>
        <ScoreSummaryStrip
          originalScore={originalOverall}
          finalScore={finalOverall}
          generations={totalGenerations}
          bestGeneration={bestGeneration}
        />
      </div>

      {/* ── Tab Bar ───────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '1rem',
        }}
      >
        <TabSwitcher
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      {/* ── Tab Content ───────────────────────── */}
      <AnimatePresence mode="wait">
        {activeTab === 'evolved' && (
          <motion.div
            key="evolved"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            <PromptBlock
              prompt={evolvedPrompt}
              label="Evolved Prompt"
              variant="evolved"
            />
          </motion.div>
        )}

        {activeTab === 'comparison' && (
          <motion.div
            key="comparison"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.75rem',
            }}
          >
            <PromptBlock
              prompt={originalPrompt}
              label="Original"
              variant="default"
            />
            <PromptBlock
              prompt={evolvedPrompt}
              label="Evolved"
              variant="evolved"
            />
          </motion.div>
        )}

        {activeTab === 'analysis' && (
          <motion.div
            key="analysis"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            style={{
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <ScoreRadarWithLegend
              scores={finalScores}
              previousScores={originalScores}
              size={240}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Actions ───────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.4 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem',
          marginTop: '1.5rem',
        }}
      >
        <motion.button
          onClick={onStartNew}
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: 'var(--accent-amber)',
            color: 'var(--bg-primary)',
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
          }}
        >
          <span>✦</span> Evolve Another
        </motion.button>

        <motion.button
          onClick={onViewHistory}
          whileHover={{ borderColor: 'var(--accent-amber)', color: 'var(--accent-amber)' }}
          whileTap={{ scale: 0.98 }}
          style={{
            padding: '0.625rem 1.25rem',
            borderRadius: '6px',
            border: '1px solid var(--border)',
            backgroundColor: 'transparent',
            color: 'var(--text-secondary)',
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 200ms ease',
          }}
        >
          View History
        </motion.button>
      </motion.div>

      {/* ── Session ID footnote ───────────────── */}
      {sessionId && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          style={{
            textAlign: 'center',
            marginTop: '1.25rem',
            fontFamily: "'DM Mono', monospace",
            fontSize: '0.625rem',
            color: 'var(--text-muted)',
            opacity: 0.4,
          }}
        >
          session: {sessionId}
        </motion.p>
      )}
    </motion.div>
  );
}
