/* ════════════════════════════════════════════════
   PARINAMA — HeroSection Component
   Landing page hero with tagline and visual motifs
   ════════════════════════════════════════════════ */

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/* ── Animated Tagline with Typewriter ────────── */

function TypewriterText({ text, delay = 0 }) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (prefersReduced) {
      setDisplayed(text);
      setDone(true);
      return;
    }

    let index = 0;
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        if (index < text.length) {
          setDisplayed(text.slice(0, index + 1));
          index++;
        } else {
          setDone(true);
          clearInterval(interval);
        }
      }, 55);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(timer);
  }, [text, delay, prefersReduced]);

  return (
    <span>
      {displayed}
      {!done && (
        <span
          className="typewriter-cursor"
          style={{
            display: 'inline-block',
            width: '2px',
            height: '1em',
            backgroundColor: 'var(--accent-amber)',
            marginLeft: '2px',
            verticalAlign: 'text-bottom',
          }}
        />
      )}
    </span>
  );
}

/* ── Floating Particles Background ───────────── */

function FloatingParticles() {
  const prefersReduced = useReducedMotion();
  if (prefersReduced) return null;

  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 2 + Math.random() * 4,
    duration: 8 + Math.random() * 12,
    delay: Math.random() * 5,
    opacity: 0.1 + Math.random() * 0.15,
  }));

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {particles.map((p) => (
        <motion.div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            backgroundColor: 'var(--accent-amber)',
            opacity: p.opacity,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, 15, -10, 0],
            opacity: [p.opacity, p.opacity * 1.5, p.opacity],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

/* ── Dimension Pills ─────────────────────────── */

const dimensions = [
  { name: 'Clarity', weight: '25%', icon: '◉' },
  { name: 'Specificity', weight: '20%', icon: '◎' },
  { name: 'Actionability', weight: '20%', icon: '▸' },
  { name: 'Conciseness', weight: '20%', icon: '⊡' },
  { name: 'Creativity', weight: '15%', icon: '✦' },
];

function DimensionPills() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 2.2, duration: 0.6 }}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem',
        justifyContent: 'center',
        maxWidth: '520px',
        margin: '0 auto',
      }}
    >
      {dimensions.map((dim, i) => (
        <motion.div
          key={dim.name}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.4 + i * 0.1, duration: 0.3 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.3rem 0.65rem',
            borderRadius: '4px',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg-surface)',
            fontSize: '0.75rem',
            fontFamily: "'Inter', sans-serif",
            color: 'var(--text-muted)',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ color: 'var(--accent-amber)', fontSize: '0.7rem' }}>
            {dim.icon}
          </span>
          <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
            {dim.name}
          </span>
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: '0.6875rem',
              opacity: 0.6,
            }}
          >
            {dim.weight}
          </span>
        </motion.div>
      ))}
    </motion.div>
  );
}

/* ── Evolution Flow Diagram ──────────────────── */

function EvolutionFlowDiagram() {
  const steps = ['Input', 'Score', 'Mutate', 'Evolve', 'Output'];
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.6, duration: 0.5 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.25rem',
        marginBottom: '1.5rem',
      }}
    >
      {steps.map((step, i) => (
        <div
          key={step}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
        >
          <motion.div
            initial={prefersReduced ? {} : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              delay: 1.8 + i * 0.15,
              type: 'spring',
              stiffness: 400,
              damping: 20,
            }}
            style={{
              padding: '0.25rem 0.625rem',
              borderRadius: '4px',
              backgroundColor: i === 0 || i === steps.length - 1
                ? 'var(--accent-amber)'
                : 'var(--bg-card)',
              border: i === 0 || i === steps.length - 1
                ? 'none'
                : '1px solid var(--border)',
              color: i === 0 || i === steps.length - 1
                ? 'var(--bg-primary)'
                : 'var(--text-secondary)',
              fontFamily: "'DM Mono', monospace",
              fontSize: '0.6875rem',
              fontWeight: 500,
            }}
          >
            {step}
          </motion.div>

          {/* Arrow connector */}
          {i < steps.length - 1 && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              transition={{ delay: 2 + i * 0.1 }}
              style={{
                color: 'var(--text-muted)',
                fontSize: '0.75rem',
                fontFamily: "'DM Mono', monospace",
              }}
            >
              →
            </motion.span>
          )}
        </div>
      ))}
    </motion.div>
  );
}

/* ── Container Variants ──────────────────────── */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

/* ── HeroSection Component ───────────────────── */

export default function HeroSection() {
  return (
    <section
      style={{
        position: 'relative',
        minHeight: 'calc(100vh - 56px - 200px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 1.5rem 2rem',
        overflow: 'hidden',
      }}
    >
      <FloatingParticles />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
          maxWidth: '720px',
        }}
      >
        {/* Sanskrit subtitle */}
        <motion.p
          variants={itemVariants}
          style={{
            fontFamily: "'Playfair Display', serif",
            fontStyle: 'italic',
            fontSize: 'clamp(0.875rem, 1.5vw, 1rem)',
            color: 'var(--accent-amber)',
            opacity: 0.8,
            marginBottom: '0.75rem',
            letterSpacing: '0.04em',
          }}
        >
          परिणाम — transformation
        </motion.p>

        {/* Main headline */}
        <motion.h1
          variants={itemVariants}
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(2.25rem, 5vw, 4rem)',
            fontWeight: 700,
            color: 'var(--text-primary)',
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            marginBottom: '1.25rem',
          }}
        >
          <TypewriterText text="Your prompts," delay={600} />
          <br />
          <span style={{ color: 'var(--accent-amber)' }}>
            <TypewriterText text="evolved." delay={1400} />
          </span>
        </motion.h1>

        {/* Description */}
        <motion.p
          variants={itemVariants}
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 'clamp(0.9375rem, 1.8vw, 1.125rem)',
            fontWeight: 400,
            color: 'var(--text-secondary)',
            lineHeight: 1.7,
            maxWidth: '560px',
            margin: '0 auto 2rem',
          }}
        >
          A self-evolving optimization engine that scores, mutates, and refines
          your prompts across five quality dimensions — inspired by natural selection.
        </motion.p>

        {/* Evolution flow */}
        <motion.div variants={itemVariants}>
          <EvolutionFlowDiagram />
        </motion.div>

        {/* Dimension pills */}
        <motion.div variants={itemVariants}>
          <DimensionPills />
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3.2, duration: 0.5 }}
          style={{
            marginTop: '3rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.75rem',
              fontWeight: 500,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Begin evolution
          </span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              width: '20px',
              height: '28px',
              borderRadius: '10px',
              border: '1.5px solid var(--text-muted)',
              display: 'flex',
              justifyContent: 'center',
              paddingTop: '6px',
              opacity: 0.5,
            }}
          >
            <motion.div
              animate={{ y: [0, 8, 0], opacity: [1, 0.3, 1] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{
                width: '3px',
                height: '6px',
                borderRadius: '2px',
                backgroundColor: 'var(--accent-amber)',
              }}
            />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Bottom fade gradient */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '80px',
          background: 'linear-gradient(to bottom, transparent, var(--bg-primary))',
          pointerEvents: 'none',
        }}
      />
    </section>
  );
}
