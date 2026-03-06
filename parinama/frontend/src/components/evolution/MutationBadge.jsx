/* ════════════════════════════════════════════════
   PARINAMA — MutationBadge Component
   Animated badge for mutation type display
   ════════════════════════════════════════════════ */

import { motion } from 'framer-motion';

/* ── Mutation Type Configuration ─────────────── */

const MUTATION_CONFIG = {
  CLARIFY: {
    label: 'Clarify',
    icon: '◉',
    description: 'Improving clarity and readability',
    color: 'var(--accent-amber)',
    bgColor: 'rgba(217, 119, 6, 0.10)',
    borderColor: 'rgba(217, 119, 6, 0.25)',
  },
  EXPAND: {
    label: 'Expand',
    icon: '◎',
    description: 'Adding detail and specificity',
    color: 'var(--accent-green)',
    bgColor: 'rgba(34, 197, 94, 0.10)',
    borderColor: 'rgba(34, 197, 94, 0.25)',
  },
  COMPRESS: {
    label: 'Compress',
    icon: '⊡',
    description: 'Reducing redundancy, tightening',
    color: 'var(--accent-terracotta)',
    bgColor: 'rgba(194, 65, 12, 0.10)',
    borderColor: 'rgba(194, 65, 12, 0.25)',
  },
  REFRAME: {
    label: 'Reframe',
    icon: '↻',
    description: 'Restructuring the approach',
    color: '#8B7355',
    bgColor: 'rgba(139, 115, 85, 0.10)',
    borderColor: 'rgba(139, 115, 85, 0.25)',
  },
  SPECIALIZE: {
    label: 'Specialize',
    icon: '▸',
    description: 'Narrowing focus and precision',
    color: '#A0826D',
    bgColor: 'rgba(160, 130, 109, 0.10)',
    borderColor: 'rgba(160, 130, 109, 0.25)',
  },
  HUMANIZE: {
    label: 'Humanize',
    icon: '✦',
    description: 'Adding natural voice and creativity',
    color: '#B8860B',
    bgColor: 'rgba(184, 134, 11, 0.10)',
    borderColor: 'rgba(184, 134, 11, 0.25)',
  },
};

const UNKNOWN_CONFIG = {
  label: 'Mutating',
  icon: '~',
  description: 'Applying mutation',
  color: 'var(--text-muted)',
  bgColor: 'var(--bg-surface)',
  borderColor: 'var(--border)',
};

/* ── Animation Variants ──────────────────────── */

const badgeVariants = {
  initial: {
    scale: 0,
    opacity: 0,
    rotate: -12,
  },
  animate: {
    scale: 1,
    opacity: 1,
    rotate: 0,
    transition: {
      type: 'spring',
      stiffness: 500,
      damping: 25,
      mass: 0.8,
    },
  },
  exit: {
    scale: 0.8,
    opacity: 0,
    transition: {
      duration: 0.15,
      ease: 'easeIn',
    },
  },
  hover: {
    scale: 1.05,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 15,
    },
  },
  tap: {
    scale: 0.95,
  },
};

const iconVariants = {
  initial: { rotate: -180, opacity: 0 },
  animate: {
    rotate: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
      delay: 0.1,
    },
  },
};

const pulseVariants = {
  initial: { scale: 1, opacity: 0.3 },
  animate: {
    scale: [1, 1.8, 1],
    opacity: [0.3, 0, 0.3],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeOut',
    },
  },
};

/* ══════════════════════════════════════════════
   MAIN — MutationBadge Component
   ══════════════════════════════════════════════ */

export default function MutationBadge({
  type = '',
  size = 'md',
  showDescription = false,
  showPulse = false,
  isActive = false,
  onClick = null,
  className = '',
  style: externalStyle = {},
}) {
  const config = MUTATION_CONFIG[type?.toUpperCase()] || UNKNOWN_CONFIG;

  /* Size presets */
  const sizes = {
    sm: {
      padding: '0.2rem 0.5rem',
      fontSize: '0.6875rem',
      iconSize: '0.7rem',
      gap: '0.25rem',
    },
    md: {
      padding: '0.3rem 0.7rem',
      fontSize: '0.75rem',
      iconSize: '0.8rem',
      gap: '0.375rem',
    },
    lg: {
      padding: '0.4rem 0.9rem',
      fontSize: '0.875rem',
      iconSize: '1rem',
      gap: '0.5rem',
    },
  };

  const sizeConfig = sizes[size] || sizes.md;

  const Component = onClick ? motion.button : motion.div;

  return (
    <Component
      className={`mutation-badge ${className}`}
      variants={badgeVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      whileHover={onClick ? 'hover' : undefined}
      whileTap={onClick ? 'tap' : undefined}
      onClick={onClick}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: sizeConfig.gap,
        padding: sizeConfig.padding,
        borderRadius: '4px',
        border: `1px solid ${config.borderColor}`,
        backgroundColor: config.bgColor,
        color: config.color,
        fontFamily: "'Inter', sans-serif",
        fontSize: sizeConfig.fontSize,
        fontWeight: 600,
        letterSpacing: '0.02em',
        cursor: onClick ? 'pointer' : 'default',
        whiteSpace: 'nowrap',
        lineHeight: 1.4,
        ...(onClick ? { outline: 'none' } : {}),
        ...externalStyle,
      }}
      aria-label={`Mutation type: ${config.label}`}
    >
      {/* Active pulse ring */}
      {(showPulse || isActive) && (
        <motion.span
          variants={pulseVariants}
          initial="initial"
          animate="animate"
          style={{
            position: 'absolute',
            inset: '-2px',
            borderRadius: '6px',
            border: `1px solid ${config.color}`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Icon */}
      <motion.span
        variants={iconVariants}
        initial="initial"
        animate="animate"
        style={{
          fontSize: sizeConfig.iconSize,
          lineHeight: 1,
          display: 'inline-flex',
          alignItems: 'center',
        }}
      >
        {config.icon}
      </motion.span>

      {/* Label */}
      <span>{config.label}</span>

      {/* Description tooltip (inline) */}
      {showDescription && (
        <motion.span
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 0.7, width: 'auto' }}
          transition={{ delay: 0.3, duration: 0.3 }}
          style={{
            fontSize: '0.6875rem',
            fontWeight: 400,
            color: config.color,
            opacity: 0.7,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            marginLeft: '0.25rem',
            borderLeft: `1px solid ${config.borderColor}`,
            paddingLeft: '0.375rem',
          }}
        >
          {config.description}
        </motion.span>
      )}
    </Component>
  );
}

/* ── Mutation Badge with Reason ──────────────── */

export function MutationBadgeWithReason({
  type = '',
  reason = '',
  targetDimension = '',
  className = '',
}) {
  const config = MUTATION_CONFIG[type?.toUpperCase()] || UNKNOWN_CONFIG;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        padding: '0.875rem',
        borderRadius: '6px',
        border: `1px solid ${config.borderColor}`,
        backgroundColor: config.bgColor,
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <MutationBadge type={type} size="md" />

        {targetDimension && (
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: '0.6875rem',
              color: 'var(--text-muted)',
              padding: '0.125rem 0.375rem',
              borderRadius: '3px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            → {targetDimension}
          </span>
        )}
      </div>

      {/* Reason text */}
      {reason && (
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.8125rem',
            fontWeight: 400,
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          {reason}
        </p>
      )}
    </motion.div>
  );
}

/* ── Mutation Type List (for selection view) ─── */

export function MutationTypeList({ activeType = '', onSelect = null }) {
  const types = Object.keys(MUTATION_CONFIG);

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.375rem',
      }}
    >
      {types.map((type, i) => (
        <motion.div
          key={type}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05, duration: 0.2 }}
        >
          <MutationBadge
            type={type}
            size="sm"
            isActive={activeType?.toUpperCase() === type}
            showPulse={activeType?.toUpperCase() === type}
            onClick={onSelect ? () => onSelect(type) : null}
            style={{
              opacity: activeType && activeType.toUpperCase() !== type ? 0.4 : 1,
              transition: 'opacity 200ms ease',
            }}
          />
        </motion.div>
      ))}
    </div>
  );
}

/* ── Export config for external use ───────────── */

export { MUTATION_CONFIG };
