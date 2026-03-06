/* ════════════════════════════════════════════════
   PARINAMA — GenerationCard Component
   Card displaying a single generation's data
   ════════════════════════════════════════════════ */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MutationBadge from './MutationBadge';
import { CompactScoreRadar } from './ScoreRadar';
import { CompactStreamingText } from './StreamingText';

/* ── Score Color Helper ──────────────────────── */

function getScoreColor(score) {
  if (score >= 80) return 'var(--accent-green)';
  if (score >= 60) return 'var(--accent-amber)';
  if (score >= 40) return 'var(--accent-terracotta)';
  return 'var(--accent-rose)';
}

/* ── Score Ring (circular progress) ──────────── */

function ScoreRing({ score, size = 56, strokeWidth = 3 }) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--bg-surface)"
          strokeWidth={strokeWidth}
        />
        {/* Score arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
          }}
        />
      </svg>

      {/* Center score number */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.3 }}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: size > 48 ? '1.125rem' : '0.875rem',
            fontWeight: 700,
            color,
            lineHeight: 1,
          }}
        >
          {score}
        </span>
      </motion.div>
    </div>
  );
}

/* ── Delta Badge ─────────────────────────────── */

function DeltaBadge({ delta }) {
  if (delta === null || delta === undefined || delta === 0) return null;

  const isPositive = delta > 0;
  const color = isPositive ? 'var(--accent-green)' : 'var(--accent-rose)';
  const bg = isPositive ? 'rgba(34, 197, 94, 0.10)' : 'rgba(225, 29, 72, 0.10)';

  return (
    <motion.span
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.5, duration: 0.3 }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.125rem',
        padding: '0.125rem 0.375rem',
        borderRadius: '3px',
        backgroundColor: bg,
        fontFamily: "'DM Mono', monospace",
        fontSize: '0.6875rem',
        fontWeight: 600,
        color,
      }}
    >
      {isPositive ? '↑' : '↓'} {Math.abs(delta)}
    </motion.span>
  );
}

/* ── Dimension Breakdown Row ─────────────────── */

function DimensionRow({ label, score, prevScore = null }) {
  const delta = prevScore !== null ? score - prevScore : null;
  const color = getScoreColor(score);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.25rem 0',
      }}
    >
      <span
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.6875rem',
          fontWeight: 500,
          color: 'var(--text-muted)',
          width: '5rem',
          flexShrink: 0,
        }}
      >
        {label}
      </span>

      {/* Bar */}
      <div
        style={{
          flex: 1,
          height: '3px',
          borderRadius: '2px',
          backgroundColor: 'var(--bg-surface)',
          overflow: 'hidden',
        }}
      >
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{
            height: '100%',
            borderRadius: '2px',
            backgroundColor: color,
          }}
        />
      </div>

      {/* Score + Delta */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          minWidth: '3rem',
          justifyContent: 'flex-end',
        }}
      >
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: '0.6875rem',
            fontWeight: 500,
            color,
          }}
        >
          {score}
        </span>

        {delta !== null && delta !== 0 && (
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: '0.5625rem',
              fontWeight: 600,
              color: delta > 0 ? 'var(--accent-green)' : 'var(--accent-rose)',
            }}
          >
            {delta > 0 ? '+' : ''}{delta}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Card Animation Variants ─────────────────── */

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 24,
    scale: 0.97,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -12,
    scale: 0.98,
    transition: {
      duration: 0.2,
    },
  },
};

/* ══════════════════════════════════════════════
   MAIN — GenerationCard Component
   ══════════════════════════════════════════════ */

export default function GenerationCard({
  generation = 0,
  prompt = '',
  scores = {},
  previousScores = null,
  mutationType = null,
  mutationReason = '',
  isStreaming = false,
  isActive = false,
  isBest = false,
  isLatest = false,
  showPrompt = true,
  showRadar = false,
  showBreakdown = false,
  onToggleExpand = null,
  className = '',
  style: externalStyle = {},
}) {
  const [expanded, setExpanded] = useState(false);

  /* Calculate overall score */
  const overallScore = useMemo(() => {
    const weights = {
      clarity: 0.25,
      specificity: 0.20,
      actionability: 0.20,
      conciseness: 0.20,
      creativity: 0.15,
    };
    let total = 0;
    Object.entries(weights).forEach(([key, weight]) => {
      total += (scores[key] ?? 0) * weight;
    });
    return Math.round(total);
  }, [scores]);

  /* Previous overall for delta */
  const prevOverallScore = useMemo(() => {
    if (!previousScores) return null;
    const weights = {
      clarity: 0.25,
      specificity: 0.20,
      actionability: 0.20,
      conciseness: 0.20,
      creativity: 0.15,
    };
    let total = 0;
    Object.entries(weights).forEach(([key, weight]) => {
      total += (previousScores[key] ?? 0) * weight;
    });
    return Math.round(total);
  }, [previousScores]);

  const delta = prevOverallScore !== null ? overallScore - prevOverallScore : null;

  const handleToggle = () => {
    setExpanded(!expanded);
    onToggleExpand?.(!expanded);
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      className={`generation-card ${className}`}
      style={{
        borderRadius: '8px',
        border: `1px solid ${
          isActive ? 'var(--accent-amber)' :
          isBest ? 'var(--accent-green)' :
          'var(--border)'
        }`,
        backgroundColor: 'var(--bg-card)',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: isActive
          ? '0 0 0 3px rgba(217, 119, 6, 0.08)'
          : '0 2px 8px var(--shadow)',
        transition: 'border-color 300ms ease, box-shadow 300ms ease',
        ...externalStyle,
      }}
    >
      {/* Active/Best indicator strip */}
      {(isActive || isBest) && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            backgroundColor: isActive ? 'var(--accent-amber)' : 'var(--accent-green)',
          }}
        />
      )}

      {/* ── Header ────────────────────────────── */}
      <div
        onClick={handleToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.875rem 1rem',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {/* Left: Gen number + mutation */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          {/* Generation label */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.125rem',
            }}
          >
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.6875rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--text-muted)',
              }}
            >
              {generation === 0 ? 'Original' : `Gen ${generation}`}
            </span>

            {/* Status labels */}
            <div style={{ display: 'flex', gap: '0.375rem' }}>
              {isBest && (
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: '0.5625rem',
                    fontWeight: 600,
                    color: 'var(--accent-green)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  ★ best
                </span>
              )}
              {isLatest && !isBest && (
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: '0.5625rem',
                    fontWeight: 600,
                    color: 'var(--accent-amber)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  latest
                </span>
              )}
            </div>
          </div>

          {/* Mutation badge */}
          {mutationType && generation > 0 && (
            <MutationBadge type={mutationType} size="sm" />
          )}
        </div>

        {/* Right: Score + Delta + Chevron */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
          }}
        >
          <DeltaBadge delta={delta} />
          <ScoreRing score={overallScore} size={44} strokeWidth={2.5} />

          {/* Expand chevron */}
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
              lineHeight: 1,
            }}
          >
            ▾
          </motion.span>
        </div>
      </div>

      {/* ── Expanded Content ──────────────────── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                padding: '0 1rem 1rem',
                borderTop: '1px solid var(--border)',
                paddingTop: '0.875rem',
              }}
            >
              {/* Scores breakdown + optional radar side by side */}
              <div
                style={{
                  display: 'flex',
                  gap: '1.25rem',
                  alignItems: 'flex-start',
                  marginBottom: showPrompt ? '0.875rem' : 0,
                }}
              >
                {/* Dimension breakdown */}
                <div style={{ flex: 1 }}>
                  <DimensionRow
                    label="Clarity"
                    score={scores.clarity ?? 0}
                    prevScore={previousScores?.clarity}
                  />
                  <DimensionRow
                    label="Specificity"
                    score={scores.specificity ?? 0}
                    prevScore={previousScores?.specificity}
                  />
                  <DimensionRow
                    label="Actionability"
                    score={scores.actionability ?? 0}
                    prevScore={previousScores?.actionability}
                  />
                  <DimensionRow
                    label="Conciseness"
                    score={scores.conciseness ?? 0}
                    prevScore={previousScores?.conciseness}
                  />
                  <DimensionRow
                    label="Creativity"
                    score={scores.creativity ?? 0}
                    prevScore={previousScores?.creativity}
                  />
                </div>

                {/* Optional radar chart */}
                {showRadar && (
                  <CompactScoreRadar scores={scores} size={100} />
                )}
              </div>

              {/* Mutation reason */}
              {mutationReason && generation > 0 && (
                <div
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    marginBottom: showPrompt ? '0.75rem' : 0,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: 'var(--text-muted)',
                      display: 'block',
                      marginBottom: '0.25rem',
                    }}
                  >
                    Mutation Rationale
                  </span>
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.8125rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                      margin: 0,
                    }}
                  >
                    {mutationReason}
                  </p>
                </div>
              )}

              {/* Prompt text */}
              {showPrompt && prompt && (
                <CompactStreamingText
                  text={prompt}
                  label={generation === 0 ? 'Original Prompt' : `Evolved Prompt (Gen ${generation})`}
                  maxHeight="180px"
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Generation Timeline (vertical card list) ── */

export function GenerationTimeline({
  generations = [],
  activeGeneration = null,
  bestGeneration = null,
  className = '',
}) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.625rem',
        position: 'relative',
      }}
    >
      {/* Vertical connecting line */}
      <div
        style={{
          position: 'absolute',
          left: '22px',
          top: '44px',
          bottom: '44px',
          width: '1px',
          backgroundColor: 'var(--border)',
          zIndex: 0,
        }}
      />

      {generations.map((gen, i) => (
        <motion.div
          key={gen.generation}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.08, duration: 0.3 }}
          style={{ position: 'relative', zIndex: 1 }}
        >
          <GenerationCard
            generation={gen.generation}
            prompt={gen.prompt}
            scores={gen.scores || {}}
            previousScores={i > 0 ? generations[i - 1]?.scores : null}
            mutationType={gen.mutationType}
            mutationReason={gen.mutationReason}
            isActive={gen.generation === activeGeneration}
            isBest={gen.generation === bestGeneration}
            isLatest={i === generations.length - 1}
            showPrompt={true}
            showRadar={false}
          />
        </motion.div>
      ))}
    </div>
  );
}
