/* ════════════════════════════════════════════════
   PARINAMA — ScoreRadar Component
   Animated radar/spider chart for 5 scoring dimensions
   ════════════════════════════════════════════════ */

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/* ── Dimension Configuration ─────────────────── */

const DIMENSIONS = [
  { key: 'clarity',       label: 'Clarity',       weight: 0.25 },
  { key: 'specificity',   label: 'Specificity',   weight: 0.20 },
  { key: 'actionability', label: 'Actionability', weight: 0.20 },
  { key: 'conciseness',   label: 'Conciseness',   weight: 0.20 },
  { key: 'creativity',    label: 'Creativity',     weight: 0.15 },
];

const AXIS_COUNT = DIMENSIONS.length;
const ANGLE_STEP = (2 * Math.PI) / AXIS_COUNT;
const START_ANGLE = -Math.PI / 2; /* Start from top */

/* ── Geometry Helpers ────────────────────────── */

function polarToCartesian(cx, cy, radius, angle) {
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

function getPolygonPoints(cx, cy, radius, values) {
  return values
    .map((val, i) => {
      const angle = START_ANGLE + i * ANGLE_STEP;
      const r = (val / 100) * radius;
      const { x, y } = polarToCartesian(cx, cy, r, angle);
      return `${x},${y}`;
    })
    .join(' ');
}

function getAxisEndpoint(cx, cy, radius, index) {
  const angle = START_ANGLE + index * ANGLE_STEP;
  return polarToCartesian(cx, cy, radius, angle);
}

/* ── Score Color Helper ──────────────────────── */

function getScoreColor(score) {
  if (score >= 80) return 'var(--accent-green)';
  if (score >= 60) return 'var(--accent-amber)';
  if (score >= 40) return 'var(--accent-terracotta)';
  return 'var(--accent-rose)';
}

/* ── Grid Rings ──────────────────────────────── */

function GridRings({ cx, cy, radius, rings = 5 }) {
  return (
    <g>
      {Array.from({ length: rings }, (_, i) => {
        const r = (radius / rings) * (i + 1);
        const points = Array.from({ length: AXIS_COUNT }, (_, j) => {
          const angle = START_ANGLE + j * ANGLE_STEP;
          const { x, y } = polarToCartesian(cx, cy, r, angle);
          return `${x},${y}`;
        }).join(' ');

        return (
          <polygon
            key={i}
            points={points}
            fill="none"
            stroke="var(--border)"
            strokeWidth="0.5"
            opacity={i === rings - 1 ? 0.5 : 0.2}
          />
        );
      })}
    </g>
  );
}

/* ── Axis Lines & Labels ─────────────────────── */

function AxisLines({ cx, cy, radius }) {
  return (
    <g>
      {DIMENSIONS.map((dim, i) => {
        const end = getAxisEndpoint(cx, cy, radius, i);
        const labelPos = getAxisEndpoint(cx, cy, radius + 18, i);

        /* Adjust text anchor based on position */
        let textAnchor = 'middle';
        if (labelPos.x < cx - 5) textAnchor = 'end';
        else if (labelPos.x > cx + 5) textAnchor = 'start';

        let dy = '0.35em';
        if (labelPos.y < cy - radius * 0.5) dy = '0em';
        else if (labelPos.y > cy + radius * 0.5) dy = '0.8em';

        return (
          <g key={dim.key}>
            {/* Axis line */}
            <line
              x1={cx}
              y1={cy}
              x2={end.x}
              y2={end.y}
              stroke="var(--border)"
              strokeWidth="0.5"
              opacity="0.4"
            />

            {/* Label */}
            <text
              x={labelPos.x}
              y={labelPos.y}
              textAnchor={textAnchor}
              dy={dy}
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '9px',
                fontWeight: 500,
                fill: 'var(--text-muted)',
                letterSpacing: '0.02em',
              }}
            >
              {dim.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/* ── Score Value Labels ──────────────────────── */

function ScoreLabels({ cx, cy, radius, scores }) {
  return (
    <g>
      {DIMENSIONS.map((dim, i) => {
        const val = scores[dim.key] ?? 0;
        const angle = START_ANGLE + i * ANGLE_STEP;
        const r = (val / 100) * radius;
        const { x, y } = polarToCartesian(cx, cy, r, angle);

        /* Offset label to avoid overlapping the dot */
        const labelOffset = val > 50 ? -10 : 10;
        const labelAngle = angle;
        const labelPos = polarToCartesian(x, y - 2, labelOffset, labelAngle);

        return (
          <motion.text
            key={dim.key}
            x={x}
            y={y - 10}
            textAnchor="middle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 + i * 0.1, duration: 0.3 }}
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: '8px',
              fontWeight: 500,
              fill: getScoreColor(val),
            }}
          >
            {val}
          </motion.text>
        );
      })}
    </g>
  );
}

/* ── Data Polygon (filled area) ──────────────── */

function DataPolygon({
  cx,
  cy,
  radius,
  scores,
  color = 'var(--accent-amber)',
  fillOpacity = 0.15,
  strokeWidth = 1.5,
  animated = true,
  delay = 0,
  prefersReduced = false,
}) {
  const values = DIMENSIONS.map((d) => scores[d.key] ?? 0);
  const points = getPolygonPoints(cx, cy, radius, values);

  /* Collapsed polygon (all zeros) for animation start */
  const zeroValues = DIMENSIONS.map(() => 0);
  const zeroPoints = getPolygonPoints(cx, cy, radius, zeroValues);

  return (
    <g>
      {/* Filled area */}
      <motion.polygon
        initial={animated && !prefersReduced
          ? { points: zeroPoints, opacity: 0 }
          : { points, opacity: fillOpacity }
        }
        animate={{ points, opacity: fillOpacity }}
        transition={{
          duration: 0.8,
          delay,
          ease: [0.22, 1, 0.36, 1],
        }}
        fill={color}
        stroke="none"
      />

      {/* Border stroke */}
      <motion.polygon
        initial={animated && !prefersReduced
          ? { points: zeroPoints, opacity: 0 }
          : { points, opacity: 1 }
        }
        animate={{ points, opacity: 1 }}
        transition={{
          duration: 0.8,
          delay,
          ease: [0.22, 1, 0.36, 1],
        }}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />

      {/* Data point dots */}
      {values.map((val, i) => {
        const angle = START_ANGLE + i * ANGLE_STEP;
        const r = (val / 100) * radius;
        const { x, y } = polarToCartesian(cx, cy, r, angle);

        return (
          <motion.circle
            key={i}
            initial={animated && !prefersReduced
              ? { cx: cx, cy: cy, r: 0, opacity: 0 }
              : { cx: x, cy: y, r: 3, opacity: 1 }
            }
            animate={{ cx: x, cy: y, r: 3, opacity: 1 }}
            transition={{
              duration: 0.6,
              delay: delay + 0.1 + i * 0.08,
              ease: [0.22, 1, 0.36, 1],
            }}
            fill={color}
            stroke="var(--bg-elevated)"
            strokeWidth="1.5"
          />
        );
      })}
    </g>
  );
}

/* ══════════════════════════════════════════════
   MAIN — ScoreRadar Component
   ══════════════════════════════════════════════ */

export default function ScoreRadar({
  scores = {},
  previousScores = null,
  size = 220,
  showLabels = true,
  showValues = true,
  showComparison = true,
  animated = true,
  className = '',
  style: externalStyle = {},
}) {
  const prefersReduced = useReducedMotion();

  const padding = 36;
  const svgSize = size;
  const cx = svgSize / 2;
  const cy = svgSize / 2;
  const radius = (svgSize - padding * 2) / 2;

  /* Calculate overall score */
  const overallScore = useMemo(() => {
    let total = 0;
    DIMENSIONS.forEach((dim) => {
      total += (scores[dim.key] ?? 0) * dim.weight;
    });
    return Math.round(total);
  }, [scores]);

  /* Check if we have any data */
  const hasData = Object.values(scores).some((v) => v > 0);

  return (
    <div
      className={`score-radar ${className}`}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        ...externalStyle,
      }}
    >
      <svg
        width={svgSize}
        height={svgSize}
        viewBox={`0 0 ${svgSize} ${svgSize}`}
        style={{ overflow: 'visible' }}
      >
        {/* Grid */}
        <GridRings cx={cx} cy={cy} radius={radius} rings={5} />

        {/* Axes */}
        {showLabels && (
          <AxisLines cx={cx} cy={cy} radius={radius} />
        )}

        {/* Previous scores (comparison ghost) */}
        {showComparison && previousScores && (
          <DataPolygon
            cx={cx}
            cy={cy}
            radius={radius}
            scores={previousScores}
            color="var(--text-muted)"
            fillOpacity={0.05}
            strokeWidth={1}
            animated={animated}
            delay={0}
            prefersReduced={prefersReduced}
          />
        )}

        {/* Current scores */}
        {hasData && (
          <DataPolygon
            cx={cx}
            cy={cy}
            radius={radius}
            scores={scores}
            color="var(--accent-amber)"
            fillOpacity={0.15}
            strokeWidth={1.5}
            animated={animated}
            delay={previousScores ? 0.3 : 0}
            prefersReduced={prefersReduced}
          />
        )}

        {/* Score value labels */}
        {showValues && hasData && (
          <ScoreLabels cx={cx} cy={cy} radius={radius} scores={scores} />
        )}

        {/* Center overall score */}
        {hasData && (
          <g>
            <motion.text
              x={cx}
              y={cy - 4}
              textAnchor="middle"
              initial={animated && !prefersReduced ? { opacity: 0, scale: 0.5 } : {}}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, duration: 0.4 }}
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '20px',
                fontWeight: 700,
                fill: getScoreColor(overallScore),
              }}
            >
              {overallScore}
            </motion.text>

            <motion.text
              x={cx}
              y={cy + 10}
              textAnchor="middle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ delay: 0.8, duration: 0.3 }}
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '7px',
                fontWeight: 600,
                fill: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              OVERALL
            </motion.text>
          </g>
        )}

        {/* Empty state */}
        {!hasData && (
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dy="0.35em"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '10px',
              fill: 'var(--text-muted)',
              opacity: 0.4,
            }}
          >
            No scores yet
          </text>
        )}
      </svg>
    </div>
  );
}

/* ── Compact Score Radar (for cards) ──────────── */

export function CompactScoreRadar({ scores = {}, size = 120 }) {
  return (
    <ScoreRadar
      scores={scores}
      size={size}
      showLabels={false}
      showValues={false}
      showComparison={false}
      animated={false}
    />
  );
}

/* ── Score Radar with Legend ──────────────────── */

export function ScoreRadarWithLegend({
  scores = {},
  previousScores = null,
  size = 220,
}) {
  const improvement = useMemo(() => {
    if (!previousScores) return null;
    let prevTotal = 0;
    let currTotal = 0;
    DIMENSIONS.forEach((dim) => {
      prevTotal += (previousScores[dim.key] ?? 0) * dim.weight;
      currTotal += (scores[dim.key] ?? 0) * dim.weight;
    });
    return Math.round(currTotal - prevTotal);
  }, [scores, previousScores]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.75rem',
      }}
    >
      <ScoreRadar
        scores={scores}
        previousScores={previousScores}
        size={size}
      />

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.375rem',
          width: '100%',
          maxWidth: `${size}px`,
        }}
      >
        {DIMENSIONS.map((dim) => {
          const val = scores[dim.key] ?? 0;
          const prevVal = previousScores?.[dim.key] ?? null;
          const delta = prevVal !== null ? val - prevVal : null;

          return (
            <div
              key={dim.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
                padding: '0.25rem 0',
              }}
            >
              {/* Dimension name */}
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.6875rem',
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  flex: 1,
                }}
              >
                {dim.label}
              </span>

              {/* Score bar */}
              <div
                style={{
                  flex: 2,
                  height: '4px',
                  borderRadius: '2px',
                  backgroundColor: 'var(--bg-surface)',
                  overflow: 'hidden',
                }}
              >
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: `${val}%` }}
                  transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
                  style={{
                    height: '100%',
                    borderRadius: '2px',
                    backgroundColor: getScoreColor(val),
                  }}
                />
              </div>

              {/* Score value + delta */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  minWidth: '3.5rem',
                  justifyContent: 'flex-end',
                }}
              >
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: '0.6875rem',
                    fontWeight: 500,
                    color: getScoreColor(val),
                  }}
                >
                  {val}
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
        })}

        {/* Overall improvement */}
        {improvement !== null && improvement !== 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.375rem',
              marginTop: '0.25rem',
              paddingTop: '0.375rem',
              borderTop: '1px solid var(--border)',
            }}
          >
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.6875rem',
                color: 'var(--text-muted)',
              }}
            >
              Overall
            </span>
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: '0.75rem',
                fontWeight: 700,
                color: improvement > 0 ? 'var(--accent-green)' : 'var(--accent-rose)',
              }}
            >
              {improvement > 0 ? '+' : ''}{improvement}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
