/* ════════════════════════════════════════════════
   PARINAMA — PromptInput Component
   Main textarea with controls and evolve trigger
   ════════════════════════════════════════════════ */

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useStore from '../../store/useStore';
import { WS_URL } from '../../config';

/* ── Constants ───────────────────────────────── */

const MIN_CHARS = 10;
const MAX_CHARS = 2000;
const MIN_GENERATIONS = 1;
const MAX_GENERATIONS = 7;

const EXAMPLE_PROMPTS = [
  'Write a blog post about machine learning',
  'Explain quantum computing to a 10-year-old',
  'Create a marketing email for a new product launch',
  'Design a database schema for an e-commerce platform',
  'Write a Python function that sorts a list efficiently',
];

/* ── Character Counter ───────────────────────── */

function CharCounter({ count, max, min }) {
  const percentage = (count / max) * 100;
  const isUnder = count < min && count > 0;
  const isNear = percentage > 85;
  const isOver = count > max;

  let color = 'var(--text-muted)';
  if (isUnder) color = 'var(--accent-rose)';
  else if (isOver) color = 'var(--accent-rose)';
  else if (isNear) color = 'var(--accent-amber)';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
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
            backgroundColor: color,
          }}
          animate={{ width: `${Math.min(percentage, 100)}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <span
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: '0.6875rem',
          color,
          transition: 'color 200ms ease',
        }}
      >
        {count}/{max}
      </span>
    </div>
  );
}

/* ── Generation Slider ───────────────────────── */

function GenerationSlider({ value, onChange }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
      }}
    >
      <label
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.75rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--text-muted)',
          whiteSpace: 'nowrap',
        }}
      >
        Generations
      </label>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          flex: 1,
        }}
      >
        {/* Decrease button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => onChange(Math.max(MIN_GENERATIONS, value - 1))}
          disabled={value <= MIN_GENERATIONS}
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '4px',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg-surface)',
            color: value <= MIN_GENERATIONS ? 'var(--text-muted)' : 'var(--text-secondary)',
            fontSize: '0.875rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: value <= MIN_GENERATIONS ? 'not-allowed' : 'pointer',
            opacity: value <= MIN_GENERATIONS ? 0.4 : 1,
          }}
          aria-label="Decrease generations"
        >
          −
        </motion.button>

        {/* Slider track */}
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="range"
            min={MIN_GENERATIONS}
            max={MAX_GENERATIONS}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            style={{
              width: '100%',
              height: '4px',
              appearance: 'none',
              WebkitAppearance: 'none',
              background: `linear-gradient(to right, var(--accent-amber) ${((value - MIN_GENERATIONS) / (MAX_GENERATIONS - MIN_GENERATIONS)) * 100}%, var(--bg-surface) ${((value - MIN_GENERATIONS) / (MAX_GENERATIONS - MIN_GENERATIONS)) * 100}%)`,
              borderRadius: '2px',
              outline: 'none',
              cursor: 'pointer',
            }}
            aria-label="Number of evolution generations"
          />
        </div>

        {/* Increase button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => onChange(Math.min(MAX_GENERATIONS, value + 1))}
          disabled={value >= MAX_GENERATIONS}
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '4px',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg-surface)',
            color: value >= MAX_GENERATIONS ? 'var(--text-muted)' : 'var(--text-secondary)',
            fontSize: '0.875rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: value >= MAX_GENERATIONS ? 'not-allowed' : 'pointer',
            opacity: value >= MAX_GENERATIONS ? 0.4 : 1,
          }}
          aria-label="Increase generations"
        >
          +
        </motion.button>

        {/* Value display */}
        <motion.span
          key={value}
          initial={{ scale: 1.3, color: 'var(--accent-amber)' }}
          animate={{ scale: 1, color: 'var(--text-primary)' }}
          transition={{ duration: 0.2 }}
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '1.25rem',
            fontWeight: 700,
            width: '1.5rem',
            textAlign: 'center',
          }}
        >
          {value}
        </motion.span>
      </div>
    </div>
  );
}

/* ── Example Prompt Pill ─────────────────────── */

function ExamplePill({ text, onClick }) {
  const truncated = text.length > 40 ? text.slice(0, 38) + '…' : text;

  return (
    <motion.button
      whileHover={{ borderColor: 'var(--accent-amber)', color: 'var(--text-primary)' }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onClick(text)}
      style={{
        padding: '0.3rem 0.75rem',
        borderRadius: '4px',
        border: '1px solid var(--border)',
        backgroundColor: 'transparent',
        color: 'var(--text-muted)',
        fontFamily: "'Inter', sans-serif",
        fontSize: '0.75rem',
        fontWeight: 400,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'border-color 200ms ease, color 200ms ease',
      }}
    >
      {truncated}
    </motion.button>
  );
}

/* ── Evolve Button ───────────────────────────── */

function EvolveButton({ onClick, disabled, loading }) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={!disabled && !loading ? { scale: 1.02, y: -1 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
      style={{
        width: '100%',
        padding: '0.875rem 1.5rem',
        borderRadius: '6px',
        border: 'none',
        backgroundColor: disabled ? 'var(--bg-surface)' : 'var(--accent-amber)',
        color: disabled ? 'var(--text-muted)' : 'var(--bg-primary)',
        fontFamily: "'Inter', sans-serif",
        fontSize: '0.9375rem',
        fontWeight: 600,
        letterSpacing: '0.02em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.625rem',
        transition: 'background-color 200ms ease',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {loading ? (
        <>
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            style={{ display: 'inline-flex' }}
          >
            ◎
          </motion.span>
          Evolving…
        </>
      ) : (
        <>
          <span style={{ fontSize: '1.1em' }}>✦</span>
          Begin Evolution
        </>
      )}

      {/* Shimmer effect on hover */}
      {!disabled && !loading && (
        <motion.div
          style={{
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
            pointerEvents: 'none',
          }}
          animate={{ left: ['−100%', '200%'] }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'linear',
            repeatDelay: 2,
          }}
        />
      )}
    </motion.button>
  );
}

/* ── Error Message ───────────────────────────── */

function ErrorMessage({ error }) {
  if (!error) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: -8, height: 0 }}
      style={{
        padding: '0.625rem 0.875rem',
        borderRadius: '4px',
        border: '1px solid var(--accent-rose)',
        backgroundColor: 'rgba(225, 29, 72, 0.08)',
        color: 'var(--accent-rose)',
        fontFamily: "'Inter', sans-serif",
        fontSize: '0.8125rem',
        fontWeight: 500,
      }}
    >
      {error}
    </motion.div>
  );
}

/* ── Main PromptInput Component ──────────────── */

export default function PromptInput({ onStartEvolution }) {
  const {
    originalPrompt,
    setOriginalPrompt,
    maxGenerations,
    setMaxGenerations,
    isEvolving,
    setScreen,
  } = useStore();

  const [error, setError] = useState(null);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef(null);
  const wsRef = useRef(null);

  const promptText = originalPrompt;
  const setPromptText = setOriginalPrompt;
  const generationCount = maxGenerations;
  const setGenerationCount = setMaxGenerations;
  const setCurrentView = setScreen;
  const charCount = promptText.length;
  const isValid = charCount >= MIN_CHARS && charCount <= MAX_CHARS;
  const isRunning = isEvolving;

  /* Auto-resize textarea */
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 240) + 'px';
    }
  }, [promptText]);

  /* Handle example selection */
  const handleExampleClick = useCallback((text) => {
    setPromptText(text);
    setError(null);
    textareaRef.current?.focus();
  }, [setPromptText]);

  /* Validate and submit */
  const handleEvolve = useCallback(async () => {
    /* Validation */
    if (charCount < MIN_CHARS) {
      setError(`Prompt must be at least ${MIN_CHARS} characters (currently ${charCount})`);
      return;
    }
    if (charCount > MAX_CHARS) {
      setError(`Prompt must be under ${MAX_CHARS} characters (currently ${charCount})`);
      return;
    }

    setError(null);

    /* Connect WebSocket */
    const wsUrl = WS_URL;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({
          action: 'start_evolution',
          prompt: promptText.trim(),
          max_generations: generationCount,
        }));
        setCurrentView('evolution');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const store = useStore.getState();

          switch (data.type) {
            case 'evolution_started':
              store.handleEvolutionStarted(data);
              break;
            case 'scoring_complete':
              store.handleScoringComplete(data);
              break;
            case 'mutation_selected':
              store.handleMutationSelected(data);
              break;
            case 'new_prompt_chunk':
              store.handleNewPromptChunk(data);
              break;
            case 'new_prompt_complete':
              store.handleNewPromptComplete(data);
              break;
            case 'llm_switched':
              store.handleLLMSwitched(data);
              break;
            case 'evolution_complete':
              store.handleEvolutionComplete(data);
              ws.close();
              break;
            case 'evolution_error':
              store.handleEvolutionError(data);
              ws.close();
              break;
            default:
              break;
          }
        } catch {
          /* Ignore malformed messages */
        }
      };

      ws.onerror = () => {
        setError('Connection error. Please check that the server is running.');
      };

      ws.onclose = () => {
        wsRef.current = null;
      };
    } catch (err) {
      setError('Failed to connect. Is the backend running?');
    }
  }, [promptText, generationCount, charCount, setCurrentView, onStartEvolution]);

  /* Cleanup WebSocket on unmount */
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  /* Keyboard shortcut: Ctrl/Cmd + Enter to evolve */
  const handleKeyDown = useCallback((e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && isValid && !isRunning) {
      e.preventDefault();
      handleEvolve();
    }
  }, [isValid, isRunning, handleEvolve]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
      style={{
        maxWidth: '640px',
        width: '100%',
        margin: '0 auto',
        padding: '0 1.5rem 4rem',
      }}
    >
      {/* Main card */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          border: `1px solid ${isFocused ? 'var(--accent-amber)' : 'var(--border)'}`,
          borderRadius: '8px',
          padding: '1.25rem',
          transition: 'border-color 300ms ease, box-shadow 300ms ease',
          boxShadow: isFocused
            ? '0 0 0 3px rgba(217, 119, 6, 0.08)'
            : '0 2px 12px var(--shadow)',
        }}
      >
        {/* Label */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.75rem',
          }}
        >
          <label
            htmlFor="prompt-input"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--text-muted)',
            }}
          >
            Your Prompt
          </label>
          <CharCounter count={charCount} max={MAX_CHARS} min={MIN_CHARS} />
        </div>

        {/* Textarea */}
        <textarea
          id="prompt-input"
          ref={textareaRef}
          value={promptText}
          onChange={(e) => {
            setPromptText(e.target.value);
            if (error) setError(null);
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder="Enter a prompt you'd like to evolve…"
          disabled={isRunning}
          rows={3}
          style={{
            width: '100%',
            minHeight: '80px',
            maxHeight: '240px',
            resize: 'none',
            padding: '0.875rem',
            borderRadius: '6px',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--input-bg)',
            color: 'var(--text-primary)',
            fontFamily: "'DM Mono', monospace",
            fontSize: '0.9375rem',
            lineHeight: 1.7,
            outline: 'none',
            transition: 'border-color 200ms ease',
          }}
          aria-describedby="prompt-help"
        />

        {/* Help text */}
        <p
          id="prompt-help"
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.6875rem',
            color: 'var(--text-muted)',
            marginTop: '0.5rem',
            opacity: 0.7,
          }}
        >
          {MIN_CHARS}–{MAX_CHARS} characters • Ctrl+Enter to evolve
        </p>

        {/* Divider */}
        <div
          style={{
            width: '100%',
            height: '1px',
            backgroundColor: 'var(--border)',
            margin: '1rem 0',
          }}
        />

        {/* Generation slider */}
        <GenerationSlider
          value={generationCount}
          onChange={setGenerationCount}
        />

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <div style={{ marginTop: '0.75rem' }}>
              <ErrorMessage error={error} />
            </div>
          )}
        </AnimatePresence>

        {/* Evolve button */}
        <div style={{ marginTop: '1rem' }}>
          <EvolveButton
            onClick={handleEvolve}
            disabled={!isValid || isRunning}
            loading={isRunning}
          />
        </div>
      </div>

      {/* Example prompts */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.4 }}
        style={{
          marginTop: '1.25rem',
        }}
      >
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.6875rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--text-muted)',
            marginBottom: '0.5rem',
            textAlign: 'center',
            opacity: 0.6,
          }}
        >
          Try an example
        </p>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.375rem',
            justifyContent: 'center',
          }}
        >
          {EXAMPLE_PROMPTS.map((prompt, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 + i * 0.08, duration: 0.3 }}
            >
              <ExamplePill text={prompt} onClick={handleExampleClick} />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.section>
  );
}
