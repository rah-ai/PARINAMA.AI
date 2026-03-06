/* ════════════════════════════════════════════════
   PARINAMA — ScoreTimeline Component
   Recharts line chart showing score progression
   ════════════════════════════════════════════════ */

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
  ComposedChart,
} from 'recharts';

/* ── Dimension Config ────────────────────────── */

const DIMENSION_LINES = [
  { key: 'clarity',       label: 'Clarity',       color: '#d97706', weight: 0.25 },
  { key: 'specificity',   label: 'Specificity',   color: '#c2410c', weight: 0.20 },
  { key: 'actionability', label: 'Actionability', color: '#22c55e', weight: 0.20 },
  { key: 'conciseness',   label: 'Conciseness',   color: '#8B7355', weight: 0.20 },
  { key: 'creativity',    label: 'Creativity',     color: '#B8860B', weight: 0.15 },
];

const OVERALL_COLOR = '#d97706';

/* ── Custom Tooltip ──────────────────────────── */

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;

  /* Find overall score */
  const overallEntry = payload.find(p => p.dataKey === 'overall');
  const overallScore = overallEntry?.value ?? null;

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-elevated, #1c1917)',
        border: '1px solid var(--border, #2a2520)',
        borderRadius: '6px',
        padding: '0.75rem',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        minWidth: '160px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.5rem',
          paddingBottom: '0.375rem',
          borderBottom: '1px solid var(--border, #2a2520)',
        }}
      >
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.6875rem',
            fontWeight: 600,
            color: 'var(--text-muted, #78716c)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {label === 'Gen 0' ? 'Original' : label}
        </span>

        {overallScore !== null && (
          <span
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '1rem',
              fontWeight: 700,
              color: getScoreColor(overallScore),
            }}
          >
            {overallScore}
          </span>
        )}
      </div>

      {/* Dimension scores */}
      {payload
        .filter(p => p.dataKey !== 'overall')
        .map((entry) => (
          <div
            key={entry.dataKey}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              padding: '0.125rem 0',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: entry.color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.6875rem',
                  color: 'var(--text-secondary, #a8a29e)',
                }}
              >
                {entry.name}
              </span>
            </div>

            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: '0.6875rem',
                fontWeight: 500,
                color: entry.color,
              }}
            >
              {entry.value}
            </span>
          </div>
        ))}
    </div>
  );
}

/* ── Custom Legend ────────────────────────────── */

function CustomLegend({ payload, onToggle, hiddenLines }) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem',
        justifyContent: 'center',
        marginTop: '0.5rem',
      }}
    >
      {payload?.map((entry) => {
        const isHidden = hiddenLines.has(entry.dataKey);

        return (
          <button
            key={entry.dataKey}
            onClick={() => onToggle(entry.dataKey)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.2rem 0.5rem',
              borderRadius: '3px',
              border: '1px solid transparent',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              opacity: isHidden ? 0.35 : 1,
              transition: 'opacity 200ms ease',
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.625rem',
              fontWeight: 500,
              color: 'var(--text-muted, #78716c)',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '3px',
                borderRadius: '2px',
                backgroundColor: entry.color,
              }}
            />
            {entry.value}
          </button>
        );
      })}
    </div>
  );
}

/* ── Custom Dot ──────────────────────────────── */

function CustomDot({ cx, cy, stroke, payload, dataKey, bestGeneration }) {
  const gen = payload?.generation;
  const isBest = gen === bestGeneration;

  return (
    <g>
      {isBest && dataKey === 'overall' && (
        <circle
          cx={cx}
          cy={cy}
          r={8}
          fill="none"
          stroke="#22c55e"
          strokeWidth={1}
          strokeDasharray="3,2"
          opacity={0.5}
        />
      )}
      <circle
        cx={cx}
        cy={cy}
        r={isBest && dataKey === 'overall' ? 5 : 3.5}
        fill={stroke}
        stroke="var(--bg-card, #1c1917)"
        strokeWidth={2}
      />
    </g>
  );
}

/* ── Score Color Helper ──────────────────────── */

function getScoreColor(score) {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#d97706';
  if (score >= 40) return '#c2410c';
  return '#e11d48';
}

/* ══════════════════════════════════════════════
   MAIN — ScoreTimeline Component
   ══════════════════════════════════════════════ */

export default function ScoreTimeline({
  generations = [],
  bestGeneration = null,
  showDimensions = true,
  showOverall = true,
  height = 280,
  className = '',
  style: externalStyle = {},
}) {
  /* Transform data for Recharts */
  const chartData = useMemo(() => {
    return generations.map((gen, i) => {
      const scores = gen.scores || {};
      let overall = 0;
      DIMENSION_LINES.forEach(dim => {
        overall += (scores[dim.key] ?? 0) * dim.weight;
      });

      return {
        name: i === 0 ? 'Gen 0' : `Gen ${i}`,
        generation: i,
        clarity: scores.clarity ?? 0,
        specificity: scores.specificity ?? 0,
        actionability: scores.actionability ?? 0,
        conciseness: scores.conciseness ?? 0,
        creativity: scores.creativity ?? 0,
        overall: Math.round(overall),
      };
    });
  }, [generations]);

  /* Hidden line toggle state */
  const { hiddenSet, toggleLine } = useHiddenLines();

  /* Calculate improvement */
  const improvement = useMemo(() => {
    if (chartData.length < 2) return null;
    return chartData[chartData.length - 1].overall - chartData[0].overall;
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: `${height}px`,
          borderRadius: '8px',
          border: '1px solid var(--border)',
          backgroundColor: 'var(--bg-card)',
          ...externalStyle,
        }}
      >
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.8125rem',
            color: 'var(--text-muted)',
            opacity: 0.5,
          }}
        >
          Score timeline will appear here
        </span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`score-timeline ${className}`}
      style={{
        borderRadius: '8px',
        border: '1px solid var(--border)',
        backgroundColor: 'var(--bg-card)',
        overflow: 'hidden',
        ...externalStyle,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1rem',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div>
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
            Score Progression
          </span>
        </div>

        {improvement !== null && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
            }}
          >
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.6875rem',
                color: 'var(--text-muted)',
              }}
            >
              Total improvement
            </span>
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: '0.75rem',
                fontWeight: 700,
                color: improvement > 0 ? '#22c55e' : improvement < 0 ? '#e11d48' : 'var(--text-muted)',
                padding: '0.125rem 0.375rem',
                borderRadius: '3px',
                backgroundColor: improvement > 0
                  ? 'rgba(34, 197, 94, 0.10)'
                  : improvement < 0
                  ? 'rgba(225, 29, 72, 0.10)'
                  : 'transparent',
              }}
            >
              {improvement > 0 ? '+' : ''}{improvement}
            </span>
          </div>
        )}
      </div>

      {/* Chart */}
      <div style={{ padding: '0.75rem 0.5rem 0.25rem' }}>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: -8, bottom: 4 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border, #2a2520)"
              opacity={0.3}
              vertical={false}
            />

            <XAxis
              dataKey="name"
              tick={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                fill: 'var(--text-muted, #78716c)',
              }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border, #2a2520)', strokeWidth: 0.5 }}
            />

            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tick={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 9,
                fill: 'var(--text-muted, #78716c)',
              }}
              tickLine={false}
              axisLine={false}
              width={32}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend
              content={
                <CustomLegend
                  hiddenLines={hiddenSet}
                  onToggle={toggleLine}
                />
              }
            />

            {/* Quality threshold line */}
            <ReferenceLine
              y={90}
              stroke="#22c55e"
              strokeDasharray="6 4"
              strokeOpacity={0.3}
              label={{
                value: 'Target',
                position: 'right',
                style: {
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 8,
                  fill: '#22c55e',
                  opacity: 0.5,
                },
              }}
            />

            {/* Overall score area */}
            {showOverall && !hiddenSet.has('overall') && (
              <Area
                type="monotone"
                dataKey="overall"
                name="Overall"
                stroke={OVERALL_COLOR}
                fill={OVERALL_COLOR}
                fillOpacity={0.08}
                strokeWidth={2.5}
                dot={<CustomDot bestGeneration={bestGeneration} dataKey="overall" />}
                activeDot={{ r: 5, stroke: OVERALL_COLOR, strokeWidth: 2 }}
                animationDuration={800}
                animationEasing="ease-out"
              />
            )}

            {/* Dimension lines */}
            {showDimensions && DIMENSION_LINES.map(dim => (
              !hiddenSet.has(dim.key) && (
                <Line
                  key={dim.key}
                  type="monotone"
                  dataKey={dim.key}
                  name={dim.label}
                  stroke={dim.color}
                  strokeWidth={1.5}
                  strokeOpacity={0.7}
                  dot={{ r: 2.5, fill: dim.color, stroke: 'var(--bg-card)', strokeWidth: 1.5 }}
                  activeDot={{ r: 4, stroke: dim.color, strokeWidth: 2 }}
                  animationDuration={1000}
                  animationEasing="ease-out"
                />
              )
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

/* ── Hook: Hidden lines toggle ───────────────── */

function useHiddenLines() {
  const [hiddenSet, setHiddenSet] = useState(() => new Set());

  const toggleLine = (key) => {
    setHiddenSet(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return { hiddenSet, toggleLine };
}

/* ── Compact variant for summary cards ───────── */

export function CompactScoreTimeline({
  generations = [],
  height = 120,
}) {
  return (
    <ScoreTimeline
      generations={generations}
      showDimensions={false}
      showOverall={true}
      height={height}
      style={{ border: 'none', backgroundColor: 'transparent' }}
    />
  );
}
