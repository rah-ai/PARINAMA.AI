/* ════════════════════════════════════════════════
   PARINAMA — LoadingDNA Component
   Animated DNA double-helix loading indicator
   ════════════════════════════════════════════════ */

import { motion } from 'framer-motion';

/* ── Configuration ───────────────────────────── */

const DNA_DEFAULTS = {
  pairs: 8,
  height: 120,
  width: 48,
  dotSize: 6,
  lineWidth: 2,
  duration: 2.4,
  colors: {
    strandA: 'var(--accent-amber)',
    strandB: 'var(--accent-terracotta)',
    bridge: 'var(--border)',
  },
};

/* ── Single DNA Base Pair ────────────────────── */

function BasePair({ index, total, config }) {
  const progress = index / (total - 1);
  const delay = progress * config.duration * 0.6;
  const y = (config.height / (total - 1)) * index;

  return (
    <g>
      {/* Left nucleotide */}
      <motion.circle
        cx="0"
        cy={y}
        r={config.dotSize / 2}
        fill={config.colors.strandA}
        animate={{
          cx: [
            config.width * 0.15,
            config.width * 0.85,
            config.width * 0.15,
          ],
          opacity: [0.6, 1, 0.6],
          r: [
            config.dotSize / 2,
            config.dotSize / 2 + 1,
            config.dotSize / 2,
          ],
        }}
        transition={{
          duration: config.duration,
          delay,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Right nucleotide */}
      <motion.circle
        cx={config.width}
        cy={y}
        r={config.dotSize / 2}
        fill={config.colors.strandB}
        animate={{
          cx: [
            config.width * 0.85,
            config.width * 0.15,
            config.width * 0.85,
          ],
          opacity: [1, 0.6, 1],
          r: [
            config.dotSize / 2 + 1,
            config.dotSize / 2,
            config.dotSize / 2 + 1,
          ],
        }}
        transition={{
          duration: config.duration,
          delay,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Bridge connecting the pair */}
      <motion.line
        y1={y}
        y2={y}
        stroke={config.colors.bridge}
        strokeWidth={config.lineWidth}
        strokeLinecap="round"
        animate={{
          x1: [
            config.width * 0.15 + config.dotSize / 2,
            config.width * 0.85 - config.dotSize / 2,
            config.width * 0.15 + config.dotSize / 2,
          ],
          x2: [
            config.width * 0.85 - config.dotSize / 2,
            config.width * 0.15 + config.dotSize / 2,
            config.width * 0.85 - config.dotSize / 2,
          ],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: config.duration,
          delay,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </g>
  );
}

/* ── Loading Message ─────────────────────────── */

const loadingMessages = [
  'Evolving your prompt…',
  'Analyzing dimensions…',
  'Selecting mutations…',
  'Refining clarity…',
  'Optimizing specificity…',
  'Enhancing creativity…',
  'परिणाम in progress…',
];

function LoadingMessage({ message, show }) {
  if (!show || !message) return null;

  return (
    <motion.p
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: '0.8125rem',
        fontWeight: 500,
        color: 'var(--text-muted)',
        textAlign: 'center',
        marginTop: '1rem',
        letterSpacing: '0.01em',
      }}
    >
      {message}
    </motion.p>
  );
}

/* ── LoadingDNA Component ────────────────────── */

export default function LoadingDNA({
  size = 'md',
  message = null,
  showMessage = true,
  className = '',
  style: externalStyle = {},
}) {
  /* Size presets */
  const sizePresets = {
    sm: { pairs: 5, height: 60, width: 28, dotSize: 4, lineWidth: 1.5, duration: 2 },
    md: { ...DNA_DEFAULTS },
    lg: { pairs: 10, height: 180, width: 64, dotSize: 8, lineWidth: 2.5, duration: 2.8 },
    xl: { pairs: 12, height: 240, width: 80, dotSize: 10, lineWidth: 3, duration: 3.2 },
  };

  const config = {
    ...DNA_DEFAULTS,
    ...(typeof size === 'string' ? sizePresets[size] || sizePresets.md : {}),
    colors: DNA_DEFAULTS.colors,
  };

  /* Auto-cycle messages if none provided */
  const displayMessage = message || (showMessage ? loadingMessages[
    Math.floor((Date.now() / 3000) % loadingMessages.length)
  ] : null);

  /* SVG padding */
  const padding = config.dotSize + 4;
  const svgWidth = config.width + padding * 2;
  const svgHeight = config.height + padding * 2;

  return (
    <div
      className={`loading-dna ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        ...externalStyle,
      }}
      role="status"
      aria-label="Loading"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <svg
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ overflow: 'visible' }}
        >
          <g transform={`translate(${padding}, ${padding})`}>
            {/* Vertical backbone strands */}
            <motion.path
              d={generateBackbonePath(config, 'left')}
              fill="none"
              stroke={config.colors.strandA}
              strokeWidth={config.lineWidth * 0.6}
              strokeLinecap="round"
              opacity={0.2}
            />
            <motion.path
              d={generateBackbonePath(config, 'right')}
              fill="none"
              stroke={config.colors.strandB}
              strokeWidth={config.lineWidth * 0.6}
              strokeLinecap="round"
              opacity={0.2}
            />

            {/* Base pairs */}
            {Array.from({ length: config.pairs }).map((_, i) => (
              <BasePair
                key={i}
                index={i}
                total={config.pairs}
                config={config}
              />
            ))}
          </g>
        </svg>
      </motion.div>

      <LoadingMessage message={displayMessage} show={showMessage} />

      {/* Screen reader text */}
      <span className="sr-only">Loading, please wait</span>
    </div>
  );
}

/* ── Helper: Generate backbone SVG path ──────── */

function generateBackbonePath(config, side) {
  const points = [];
  const total = config.pairs;

  for (let i = 0; i < total; i++) {
    const progress = i / (total - 1);
    const y = (config.height / (total - 1)) * i;

    /* Approximate sinusoidal x positions for the backbone */
    const phase = progress * Math.PI * 2;
    const x = side === 'left'
      ? config.width * 0.15 + Math.sin(phase) * (config.width * 0.35)
      : config.width * 0.85 - Math.sin(phase) * (config.width * 0.35);

    if (i === 0) {
      points.push(`M ${x} ${y}`);
    } else {
      /* Smooth curve segments */
      const prevProgress = (i - 1) / (total - 1);
      const prevY = (config.height / (total - 1)) * (i - 1);
      const prevPhase = prevProgress * Math.PI * 2;
      const prevX = side === 'left'
        ? config.width * 0.15 + Math.sin(prevPhase) * (config.width * 0.35)
        : config.width * 0.85 - Math.sin(prevPhase) * (config.width * 0.35);

      const cpY = (prevY + y) / 2;
      points.push(`Q ${prevX} ${cpY} ${x} ${y}`);
    }
  }

  return points.join(' ');
}

/* ── Inline variant for text contexts ────────── */

export function InlineDNA({ className = '' }) {
  return (
    <LoadingDNA
      size="sm"
      showMessage={false}
      className={className}
      style={{ display: 'inline-flex', verticalAlign: 'middle' }}
    />
  );
}

/* ── Full-page overlay variant ───────────────── */

export function FullPageDNA({ message = 'Initializing evolution…' }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-primary)',
        zIndex: 9999,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <LoadingDNA size="lg" message={message} />

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.5 }}
          style={{
            marginTop: '2rem',
            fontFamily: "'Playfair Display', serif",
            fontStyle: 'italic',
            fontSize: '1rem',
            color: 'var(--accent-amber)',
            opacity: 0.7,
          }}
        >
          परिणाम — transformation through evolution
        </motion.p>
      </div>
    </motion.div>
  );
}
