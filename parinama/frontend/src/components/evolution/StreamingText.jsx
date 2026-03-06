/* ════════════════════════════════════════════════
   PARINAMA — StreamingText Component
   Real-time character streaming with typewriter cursor
   ════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

/* ── Blinking Cursor ─────────────────────────── */

function TypewriterCursor({ visible, color = 'var(--accent-amber)' }) {
  if (!visible) return null;

  return (
    <motion.span
      animate={{ opacity: [1, 0, 1] }}
      transition={{ duration: 0.8, repeat: Infinity, ease: 'steps(2)' }}
      style={{
        display: 'inline-block',
        width: '2px',
        height: '1.1em',
        backgroundColor: color,
        marginLeft: '1px',
        verticalAlign: 'text-bottom',
        borderRadius: '1px',
      }}
      aria-hidden="true"
    />
  );
}

/* ── Word-level Highlighter ──────────────────── */

function HighlightedWord({ word, index, isNew, prefersReduced }) {
  if (!isNew || prefersReduced) {
    return <span>{word}</span>;
  }

  return (
    <motion.span
      initial={{ backgroundColor: 'rgba(217, 119, 6, 0.15)' }}
      animate={{ backgroundColor: 'rgba(217, 119, 6, 0)' }}
      transition={{ duration: 1.2, delay: 0.1 }}
      style={{
        borderRadius: '2px',
        padding: '0 1px',
      }}
    >
      {word}
    </motion.span>
  );
}

/* ── Line Number Gutter ──────────────────────── */

function LineGutter({ lineNumber, isActive }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: '2rem',
        textAlign: 'right',
        paddingRight: '0.75rem',
        fontFamily: "'DM Mono', monospace",
        fontSize: '0.6875rem',
        color: isActive ? 'var(--accent-amber)' : 'var(--text-muted)',
        opacity: isActive ? 0.8 : 0.3,
        userSelect: 'none',
        transition: 'color 200ms ease, opacity 200ms ease',
        flexShrink: 0,
      }}
    >
      {lineNumber}
    </span>
  );
}

/* ── Diff Indicator ──────────────────────────── */

function DiffMarker({ type }) {
  if (!type) return null;

  const markers = {
    added: { symbol: '+', color: 'var(--accent-green)' },
    removed: { symbol: '−', color: 'var(--accent-rose)' },
    changed: { symbol: '~', color: 'var(--accent-amber)' },
  };

  const marker = markers[type];
  if (!marker) return null;

  return (
    <span
      style={{
        display: 'inline-block',
        width: '1rem',
        textAlign: 'center',
        fontFamily: "'DM Mono', monospace",
        fontSize: '0.75rem',
        fontWeight: 700,
        color: marker.color,
        flexShrink: 0,
      }}
    >
      {marker.symbol}
    </span>
  );
}

/* ── Streaming Status Bar ────────────────────── */

function StreamingStatus({ isStreaming, charCount, isComplete }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.375rem 0.75rem',
        borderTop: '1px solid var(--border)',
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '0 0 6px 6px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        {/* Status dot */}
        <motion.span
          style={{
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            backgroundColor: isStreaming
              ? 'var(--accent-green)'
              : isComplete
              ? 'var(--accent-amber)'
              : 'var(--text-muted)',
          }}
          animate={isStreaming ? {
            opacity: [1, 0.4, 1],
          } : {}}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: '0.6875rem',
            color: 'var(--text-muted)',
          }}
        >
          {isStreaming ? 'streaming…' : isComplete ? 'complete' : 'waiting'}
        </span>
      </div>

      <span
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: '0.6875rem',
          color: 'var(--text-muted)',
          opacity: 0.6,
        }}
      >
        {charCount} chars
      </span>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN — StreamingText Component
   ══════════════════════════════════════════════ */

export default function StreamingText({
  text = '',
  isStreaming = false,
  isComplete = false,
  showLineNumbers = true,
  showDiff = false,
  diffLines = [],
  showStatus = true,
  label = null,
  maxHeight = '320px',
  className = '',
  style: externalStyle = {},
}) {
  const prefersReduced = useReducedMotion();
  const containerRef = useRef(null);
  const prevTextRef = useRef('');
  const [newWordIndices, setNewWordIndices] = useState(new Set());

  /* Track newly added words for highlight */
  useEffect(() => {
    if (prefersReduced) return;

    const prevLen = prevTextRef.current.length;
    const currLen = text.length;

    if (currLen > prevLen && isStreaming) {
      const words = text.split(/(\s+)/);
      const prevWords = prevTextRef.current.split(/(\s+)/);
      const newIndices = new Set();

      for (let i = prevWords.length; i < words.length; i++) {
        newIndices.add(i);
      }

      setNewWordIndices(newIndices);

      /* Clear highlights after animation */
      const timer = setTimeout(() => {
        setNewWordIndices(new Set());
      }, 1500);

      prevTextRef.current = text;
      return () => clearTimeout(timer);
    }

    prevTextRef.current = text;
  }, [text, isStreaming, prefersReduced]);

  /* Auto-scroll to bottom during streaming */
  useEffect(() => {
    if (isStreaming && containerRef.current) {
      const el = containerRef.current;
      el.scrollTop = el.scrollHeight;
    }
  }, [text, isStreaming]);

  /* Split text into lines */
  const lines = useMemo(() => {
    if (!text) return [''];
    return text.split('\n');
  }, [text]);

  /* Determine the active (last) line */
  const activeLineIndex = isStreaming ? lines.length - 1 : -1;

  return (
    <div
      className={`streaming-text ${className}`}
      style={{
        borderRadius: '6px',
        border: '1px solid var(--border)',
        backgroundColor: 'var(--bg-elevated)',
        overflow: 'hidden',
        ...externalStyle,
      }}
    >
      {/* Optional label header */}
      {label && (
        <div
          style={{
            padding: '0.5rem 0.75rem',
            borderBottom: '1px solid var(--border)',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.6875rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--text-muted)',
            }}
          >
            {label}
          </span>
        </div>
      )}

      {/* Text content area */}
      <div
        ref={containerRef}
        style={{
          padding: '0.875rem',
          maxHeight,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {/* Empty state */}
        {!text && !isStreaming && (
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
              opacity: 0.5,
              fontStyle: 'italic',
            }}
          >
            Waiting for prompt…
          </span>
        )}

        {/* Rendered lines */}
        {lines.map((line, lineIdx) => {
          const diffType = showDiff && diffLines[lineIdx]
            ? diffLines[lineIdx]
            : null;

          return (
            <div
              key={lineIdx}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                minHeight: '1.7em',
                backgroundColor: diffType === 'added'
                  ? 'rgba(34, 197, 94, 0.06)'
                  : diffType === 'removed'
                  ? 'rgba(225, 29, 72, 0.06)'
                  : 'transparent',
                borderRadius: '2px',
                marginBottom: '1px',
              }}
            >
              {/* Line number */}
              {showLineNumbers && (
                <LineGutter
                  lineNumber={lineIdx + 1}
                  isActive={lineIdx === activeLineIndex}
                />
              )}

              {/* Diff marker */}
              {showDiff && <DiffMarker type={diffType} />}

              {/* Line content */}
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: '0.9375rem',
                  lineHeight: 1.7,
                  color: 'var(--text-primary)',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap',
                  flex: 1,
                }}
              >
                {renderLineContent(line, lineIdx, lines, newWordIndices, prefersReduced)}

                {/* Cursor at end of last line while streaming */}
                {lineIdx === activeLineIndex && isStreaming && (
                  <TypewriterCursor visible={true} />
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* Status bar */}
      {showStatus && (
        <StreamingStatus
          isStreaming={isStreaming}
          charCount={text.length}
          isComplete={isComplete}
        />
      )}
    </div>
  );
}

/* ── Helper: Render line content with word highlights ── */

function renderLineContent(line, lineIdx, allLines, newWordIndices, prefersReduced) {
  if (!line) return ' '; /* Preserve empty lines */

  /* Calculate global word offset for this line */
  let globalOffset = 0;
  for (let i = 0; i < lineIdx; i++) {
    globalOffset += allLines[i].split(/(\s+)/).length;
    globalOffset += 1; /* newline separator */
  }

  const words = line.split(/(\s+)/);

  return words.map((word, wordIdx) => {
    const globalIdx = globalOffset + wordIdx;
    const isNew = newWordIndices.has(globalIdx);

    return (
      <HighlightedWord
        key={`${lineIdx}-${wordIdx}`}
        word={word}
        index={globalIdx}
        isNew={isNew}
        prefersReduced={prefersReduced}
      />
    );
  });
}

/* ── Compact variant for side-by-side views ──── */

export function CompactStreamingText({
  text = '',
  label = '',
  maxHeight = '200px',
}) {
  return (
    <StreamingText
      text={text}
      isComplete={true}
      showLineNumbers={false}
      showStatus={false}
      label={label}
      maxHeight={maxHeight}
      style={{ fontSize: '0.8125rem' }}
    />
  );
}

/* ── Before/After comparison view ────────────── */

export function PromptComparison({
  before = '',
  after = '',
  beforeLabel = 'Original',
  afterLabel = 'Evolved',
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '0.75rem',
      }}
    >
      <CompactStreamingText text={before} label={beforeLabel} />
      <CompactStreamingText text={after} label={afterLabel} />
    </div>
  );
}
