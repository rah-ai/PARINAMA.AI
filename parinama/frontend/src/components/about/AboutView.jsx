/* ════════════════════════════════════════════════
   PARINAMA — About View
   ════════════════════════════════════════════════ */

import { motion } from 'framer-motion';

export default function AboutView() {
  return (
    <motion.div
      key="about"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      style={{
        maxWidth: '640px',
        margin: '0 auto',
        padding: '3rem 1.5rem',
      }}
    >
      {/* Title */}
      <h1
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '2rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: '0.5rem',
        }}
      >
        About <span style={{ color: 'var(--accent-amber)' }}>PARINAMA</span>
      </h1>

      <p
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: '0.8125rem',
          color: 'var(--text-muted)',
          marginBottom: '2rem',
          letterSpacing: '0.02em',
        }}
      >
        self-evolving prompt optimization engine
      </p>

      {/* Description */}
      <div
        style={{
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          backgroundColor: 'var(--bg-card)',
          marginBottom: '1.5rem',
        }}
      >
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.9375rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.7,
            margin: 0,
          }}
        >
          PARINAMA (Sanskrit for <em>"transformation"</em>) is a self-evolving
          prompt optimization engine. It takes your prompt, scores it across
          multiple dimensions, applies intelligent mutations, and evolves it
          across generations — mimicking natural selection to produce
          higher-quality prompts.
        </p>
      </div>

      {/* Made by */}
      <div
        style={{
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          backgroundColor: 'var(--bg-card)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        {/* Avatar placeholder */}
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent-amber)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
            fontWeight: 700,
            color: 'var(--bg-primary)',
            flexShrink: 0,
          }}
        >
          RM
        </div>

        <div>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '1rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            Made by Rahul Makwana
          </p>
        </div>
      </div>

      {/* Contact */}
      <div
        style={{
          marginTop: '1.5rem',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          backgroundColor: 'var(--bg-card)',
        }}
      >
        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: '0.75rem',
          }}
        >
          Get in touch
        </p>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            margin: '0 0 0.75rem',
          }}
        >
          Have feedback, ideas, or want to collaborate? We'd love to hear from you.
        </p>
        <a
          href="mailto:parinama.ai@gmail.com"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg-surface)',
            fontFamily: "'DM Mono', monospace",
            fontSize: '0.8125rem',
            color: 'var(--accent-amber)',
            textDecoration: 'none',
            fontWeight: 500,
            transition: 'background-color 150ms ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-card)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface)'}
        >
          ✉ parinama.ai@gmail.com
        </a>
      </div>

      {/* Tech stack */}
      <div
        style={{
          marginTop: '1.5rem',
          padding: '1.25rem 1.5rem',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          backgroundColor: 'var(--bg-card)',
        }}
      >
        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: '0.75rem',
          }}
        >
          Built with
        </p>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          {['Python', 'FastAPI', 'React', 'Groq', 'Gemini', 'D3.js', 'Framer Motion'].map(
            (tech) => (
              <span
                key={tech}
                style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '4px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-surface)',
                  fontFamily: "'DM Mono', monospace",
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                }}
              >
                {tech}
              </span>
            )
          )}
        </div>
      </div>
    </motion.div>
  );
}
