/* ════════════════════════════════════════════════
   PARINAMA — HistoryView Component
   Displays past evolution sessions with scores
   ════════════════════════════════════════════════ */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from '../../config';

/* ── Score Badge ─────────────────────────────── */

function ScoreBadge({ score, size = 'normal' }) {
  const getColor = (s) => {
    if (s >= 80) return 'var(--accent-green)';
    if (s >= 60) return 'var(--accent-amber)';
    if (s >= 40) return 'var(--accent-terracotta)';
    return 'var(--accent-rose)';
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size === 'small' ? '32px' : '40px',
        height: size === 'small' ? '32px' : '40px',
        borderRadius: '50%',
        border: `2px solid ${getColor(score)}`,
        backgroundColor: `${getColor(score)}15`,
        fontFamily: "'Playfair Display', serif",
        fontSize: size === 'small' ? '0.75rem' : '0.875rem',
        fontWeight: 700,
        color: getColor(score),
      }}
    >
      {Math.round(score)}
    </span>
  );
}

/* ── Session Card ────────────────────────────── */

function SessionCard({ session, onSelect, index }) {
  const {
    session_id,
    original_prompt,
    best_prompt,
    best_score = 0,
    initial_score = 0,
    improvement = 0,
    total_generations = 0,
    status = 'unknown',
    primary_llm_used,
    created_at,
  } = session;

  const improvementSign = improvement > 0 ? '+' : '';
  const promptPreview = (original_prompt || '').substring(0, 120);
  const bestPreview = (best_prompt || original_prompt || '').substring(0, 120);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const statusColors = {
    completed: 'var(--accent-green)',
    failed: 'var(--accent-rose)',
    evolving: 'var(--accent-amber)',
    pending: 'var(--text-muted)',
    unknown: 'var(--text-muted)',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{
        borderColor: 'var(--accent-amber)',
        y: -2,
        transition: { duration: 0.2 },
      }}
      onClick={() => onSelect(session)}
      style={{
        padding: '1rem 1.25rem',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        backgroundColor: 'var(--bg-surface)',
        cursor: 'pointer',
        transition: 'border-color 200ms ease',
      }}
    >
      {/* Top row: Score + Prompt + Date */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '1rem',
        }}
      >
        {/* Score Badge */}
        <ScoreBadge score={best_score} />

        {/* Prompt Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: '0.8125rem',
              lineHeight: 1.5,
              color: 'var(--text-primary)',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {promptPreview || 'No prompt'}
          </p>

          {best_prompt && best_prompt !== original_prompt && (
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                margin: '0.25rem 0 0',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              → {bestPreview}
            </p>
          )}
        </div>

        {/* Date */}
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: '0.6875rem',
            color: 'var(--text-muted)',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {formatDate(created_at)}
        </span>
      </div>

      {/* Bottom row: Stats */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginTop: '0.75rem',
          paddingTop: '0.5rem',
          borderTop: '1px solid var(--border)',
        }}
      >
        {/* Status */}
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.6875rem',
            fontWeight: 500,
            color: statusColors[status] || 'var(--text-muted)',
            textTransform: 'capitalize',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: statusColors[status] || 'var(--text-muted)',
            }}
          />
          {status}
        </span>

        {/* Generations */}
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: '0.6875rem',
            color: 'var(--text-muted)',
          }}
        >
          {total_generations} gen{total_generations !== 1 ? 's' : ''}
        </span>

        {/* Improvement */}
        {improvement !== 0 && (
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: '0.6875rem',
              fontWeight: 600,
              color: improvement > 0 ? 'var(--accent-green)' : 'var(--accent-rose)',
            }}
          >
            {improvementSign}{Math.round(improvement * 100) / 100}
          </span>
        )}

        {/* LLM */}
        {primary_llm_used && (
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: '0.6875rem',
              color: 'var(--text-muted)',
              marginLeft: 'auto',
            }}
          >
            via {primary_llm_used}
          </span>
        )}
      </div>
    </motion.div>
  );
}

/* ── Session Detail Modal ────────────────────── */

function SessionDetail({ session, onClose, onReevolve }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDetail() {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/sessions/${session.session_id}`);
        if (res.ok) {
          const data = await res.json();
          setDetail(data);
        }
      } catch (err) {
        console.error('Failed to load session detail:', err);
      } finally {
        setLoading(false);
      }
    }

    if (session?.session_id) {
      loadDetail();
    }
  }, [session?.session_id]);

  const data = detail || session;
  const generations = data.generations || [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        padding: '2rem',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '700px',
          maxHeight: '80vh',
          overflow: 'auto',
          borderRadius: '10px',
          border: '1px solid var(--border)',
          backgroundColor: 'var(--bg-primary)',
          padding: '1.5rem',
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            Loading session details...
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <h3
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    margin: 0,
                  }}
                >
                  Session Detail
                </h3>
                <p style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: '0.625rem',
                  color: 'var(--text-muted)',
                  margin: '0.25rem 0 0',
                }}>
                  {data.session_id}
                </p>
              </div>
              <button
                onClick={onClose}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-muted)',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            {/* Stats Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '0.75rem',
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', display: 'block' }}>Initial</span>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{Math.round(data.initial_score || 0)}</span>
              </div>
              <div style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', display: 'block' }}>Best</span>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-green)' }}>{Math.round(data.best_score || 0)}</span>
              </div>
              <div style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', display: 'block' }}>Improve</span>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.25rem', fontWeight: 700, color: (data.score_improvement || 0) > 0 ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                  {(data.score_improvement || 0) > 0 ? '+' : ''}{Math.round(data.score_improvement || 0)}
                </span>
              </div>
              <div style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', display: 'block' }}>Gens</span>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-amber)' }}>{data.total_generations || generations.length}</span>
              </div>
            </div>

            {/* Original Prompt */}
            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.6875rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
                marginBottom: '0.375rem',
              }}>
                Original Prompt
              </h4>
              <div style={{
                padding: '0.75rem',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-surface)',
                fontFamily: "'DM Mono', monospace",
                fontSize: '0.8125rem',
                lineHeight: 1.6,
                color: 'var(--text-secondary)',
                whiteSpace: 'pre-wrap',
              }}>
                {data.original_prompt || 'N/A'}
              </div>
            </div>

            {/* Best Prompt */}
            {data.best_prompt && data.best_prompt !== data.original_prompt && (
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--accent-amber)',
                  marginBottom: '0.375rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}>
                  <span>✦</span> Evolved Prompt
                </h4>
                <div style={{
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--accent-amber)',
                  backgroundColor: 'rgba(217, 119, 6, 0.04)',
                  fontFamily: "'DM Mono', monospace",
                  fontSize: '0.8125rem',
                  lineHeight: 1.6,
                  color: 'var(--text-primary)',
                  whiteSpace: 'pre-wrap',
                }}>
                  {data.best_prompt}
                </div>
              </div>
            )}

            {/* Generations List */}
            {generations.length > 0 && (
              <div>
                <h4 style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--text-muted)',
                  marginBottom: '0.5rem',
                }}>
                  Generations ({generations.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {generations.map((gen, idx) => {
                    const genScores = gen.scores || {};
                    const total = typeof genScores === 'object' ? (genScores.total || 0) : 0;
                    return (
                      <div
                        key={idx}
                        style={{
                          padding: '0.5rem 0.75rem',
                          borderRadius: '6px',
                          border: '1px solid var(--border)',
                          backgroundColor: 'var(--bg-elevated)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                        }}
                      >
                        <span style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: '0.6875rem',
                          color: 'var(--text-muted)',
                          fontWeight: 600,
                          minWidth: '40px',
                        }}>
                          Gen {gen.generation_num ?? gen.generation ?? idx}
                        </span>
                        <ScoreBadge score={total} size="small" />
                        {gen.mutation_type && (
                          <span style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: '0.6875rem',
                            color: 'var(--accent-amber)',
                            fontWeight: 500,
                          }}>
                            {gen.mutation_type}
                          </span>
                        )}
                        <span style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: '0.75rem',
                          color: 'var(--text-secondary)',
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {(gen.prompt_text || gen.prompt || '').substring(0, 80)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <motion.button
                onClick={() => onReevolve(data.original_prompt)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  padding: '0.625rem 1.25rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: 'var(--accent-amber)',
                  color: 'var(--bg-primary)',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                }}
              >
                <span>✦</span> Re-evolve
              </motion.button>
              <motion.button
                onClick={onClose}
                whileHover={{ borderColor: 'var(--text-secondary)' }}
                whileTap={{ scale: 0.98 }}
                style={{
                  padding: '0.625rem 1.25rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Close
              </motion.button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════
   MAIN — HistoryView Component
   ══════════════════════════════════════════════ */

export default function HistoryView({ onStartEvolution }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const LIMIT = 20;

  const fetchSessions = useCallback(async (offset = 0) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/sessions?limit=${LIMIT}&offset=${offset}`);
      if (!res.ok) throw new Error(`Failed to fetch sessions (${res.status})`);
      const data = await res.json();
      setSessions(data.sessions || []);
      setHasMore(data.has_more || false);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions(page * LIMIT);
  }, [page, fetchSessions]);

  const handleReevolve = useCallback((prompt) => {
    if (onStartEvolution && prompt) {
      setSelectedSession(null);
      onStartEvolution(prompt, 5);
    }
  }, [onStartEvolution]);

  return (
    <motion.div
      key="history"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.5 }}
      style={{
        width: '100%',
        maxWidth: '800px',
        margin: '0 auto',
        padding: '2rem 1.5rem 4rem',
      }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ marginBottom: '1.5rem' }}
      >
        <h2
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(1.25rem, 3vw, 1.75rem)',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: '0.25rem',
          }}
        >
          Evolution History
        </h2>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.875rem',
            color: 'var(--text-muted)',
          }}
        >
          {total > 0 ? `${total} evolution session${total !== 1 ? 's' : ''} recorded` : 'No sessions yet'}
        </p>
      </motion.div>

      {/* Loading */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            textAlign: 'center',
            padding: '3rem',
            color: 'var(--text-muted)',
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.875rem',
          }}
        >
          Loading sessions...
        </motion.div>
      )}

      {/* Error */}
      {error && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            textAlign: 'center',
            padding: '2rem',
            borderRadius: '8px',
            border: '1px solid var(--accent-rose)',
            backgroundColor: 'rgba(239, 68, 68, 0.05)',
          }}
        >
          <p style={{ color: 'var(--accent-rose)', fontSize: '0.875rem', margin: '0 0 0.75rem' }}>
            {error}
          </p>
          <motion.button
            onClick={() => fetchSessions(page * LIMIT)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: '1px solid var(--accent-amber)',
              backgroundColor: 'transparent',
              color: 'var(--accent-amber)',
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.8125rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Retry
          </motion.button>
        </motion.div>
      )}

      {/* Empty State */}
      {!loading && !error && sessions.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            borderRadius: '8px',
            border: '1px dashed var(--border)',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem', opacity: 0.3 }}>✦</div>
          <h3
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '1.125rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: '0.5rem',
            }}
          >
            No Evolution History
          </h3>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.8125rem',
              color: 'var(--text-muted)',
              marginBottom: '1.25rem',
            }}
          >
            Start your first prompt evolution to see results here
          </p>
          <motion.button
            onClick={() => onStartEvolution && onStartEvolution('', 5)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              padding: '0.625rem 1.25rem',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: 'var(--accent-amber)',
              color: 'var(--bg-primary)',
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ✦ Start Evolving
          </motion.button>
        </motion.div>
      )}

      {/* Sessions List */}
      {!loading && !error && sessions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {sessions.map((session, idx) => (
            <SessionCard
              key={session.session_id || idx}
              session={session}
              onSelect={setSelectedSession}
              index={idx}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && total > LIMIT && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            marginTop: '1.5rem',
          }}
        >
          <motion.button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            whileHover={page > 0 ? { scale: 1.02 } : {}}
            whileTap={page > 0 ? { scale: 0.98 } : {}}
            style={{
              padding: '0.375rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              backgroundColor: 'transparent',
              color: page === 0 ? 'var(--text-muted)' : 'var(--text-secondary)',
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.75rem',
              cursor: page === 0 ? 'not-allowed' : 'pointer',
              opacity: page === 0 ? 0.4 : 1,
            }}
          >
            ← Previous
          </motion.button>

          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
            }}
          >
            Page {page + 1} of {Math.ceil(total / LIMIT)}
          </span>

          <motion.button
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore}
            whileHover={hasMore ? { scale: 1.02 } : {}}
            whileTap={hasMore ? { scale: 0.98 } : {}}
            style={{
              padding: '0.375rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              backgroundColor: 'transparent',
              color: !hasMore ? 'var(--text-muted)' : 'var(--text-secondary)',
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.75rem',
              cursor: !hasMore ? 'not-allowed' : 'pointer',
              opacity: !hasMore ? 0.4 : 1,
            }}
          >
            Next →
          </motion.button>
        </div>
      )}

      {/* Session Detail Modal */}
      <AnimatePresence>
        {selectedSession && (
          <SessionDetail
            session={selectedSession}
            onClose={() => setSelectedSession(null)}
            onReevolve={handleReevolve}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
