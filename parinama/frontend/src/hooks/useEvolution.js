/* ════════════════════════════════════════════════
   PARINAMA — useEvolution Hook
   Custom hook encapsulating the full WebSocket
   evolution lifecycle: connect → evolve → stream
   ════════════════════════════════════════════════ */

import { useCallback, useEffect, useRef, useState } from 'react';
import { WS_URL, API_BASE } from '../config';

/* ── Constants ───────────────────────────────── */

const RECONNECT_DELAY = 2000;
const MAX_RECONNECT_ATTEMPTS = 5;
const HEARTBEAT_INTERVAL = 30000;

/* ── Evolution States ────────────────────────── */

export const EvolutionPhase = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  SCORING: 'scoring',
  MUTATING: 'mutating',
  EVOLVING: 'evolving',
  STREAMING: 'streaming',
  COMPLETED: 'completed',
  ERROR: 'error',
  CANCELLED: 'cancelled',
};

/* ── Default Scores ──────────────────────────── */

const emptyScores = () => ({
  clarity: 0,
  specificity: 0,
  actionability: 0,
  conciseness: 0,
  creativity: 0,
});

/* ══════════════════════════════════════════════
   HOOK — useEvolution
   ══════════════════════════════════════════════ */

export default function useEvolution() {
  /* ── Core state ────────────────────────────── */
  const [phase, setPhase] = useState(EvolutionPhase.IDLE);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  /* ── Session data ──────────────────────────── */
  const [sessionId, setSessionId] = useState(null);
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [evolvedPrompt, setEvolvedPrompt] = useState('');

  /* ── Scores ────────────────────────────────── */
  const [originalScores, setOriginalScores] = useState(emptyScores());
  const [currentScores, setCurrentScores] = useState(emptyScores());

  /* ── Generations ───────────────────────────── */
  const [generations, setGenerations] = useState([]);
  const [currentGeneration, setCurrentGeneration] = useState(0);
  const [totalGenerations, setTotalGenerations] = useState(0);
  const [bestGeneration, setBestGeneration] = useState(null);

  /* ── Streaming ─────────────────────────────── */
  const [streamingText, setStreamingText] = useState('');
  const [currentMutation, setCurrentMutation] = useState(null);
  const [currentProvider, setCurrentProvider] = useState(null);

  /* ── Refs ───────────────────────────────────── */
  const wsRef = useRef(null);
  const heartbeatRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef(null);
  const isEvolvingRef = useRef(false);

  /* ────────────────────────────────────────────
     WebSocket Message Handlers
     ──────────────────────────────────────────── */

  const handleMessage = useCallback((event) => {
    try {
      const raw = JSON.parse(event.data);

      /* Backend sends { event, data, ... } — unwrap */
      const eventType = raw.event || raw.type;
      const msg = raw.data || raw;

      switch (eventType) {
        case 'connection_established':
          setIsConnected(true);
          reconnectAttempts.current = 0;
          break;

        case 'pong':
          /* Heartbeat acknowledgment */
          break;

        case 'evolution_started':
          setPhase(EvolutionPhase.SCORING);
          setSessionId(raw.session_id || msg.session_id || null);
          setTotalGenerations(msg.max_generations || 0);
          setCurrentGeneration(0);
          setGenerations([]);
          setEvolvedPrompt('');
          setStreamingText('');
          setError(null);
          isEvolvingRef.current = true;
          break;

        case 'scoring_complete':
          setPhase(EvolutionPhase.MUTATING);
          setOriginalScores((prev) => {
            /* Only set original scores on gen 0 */
            if (msg.generation_num === 0 || msg.generation_num === 1) {
              return msg.scores || emptyScores();
            }
            return prev;
          });
          setCurrentScores(msg.scores || emptyScores());
          setCurrentProvider(msg.llm_used || null);
          setGenerations((prev) => {
            const existingIdx = prev.findIndex(g => g.generation === msg.generation_num);
            const genData = {
              generation: msg.generation_num,
              prompt: prev[existingIdx]?.prompt || originalPrompt,
              scores: msg.scores || emptyScores(),
              overallScore: msg.total ?? 0,
              mutationType: prev[existingIdx]?.mutationType || null,
              mutationReason: prev[existingIdx]?.mutationReason || null,
              provider: msg.llm_used || null,
              weaknesses: msg.weaknesses || [],
              strengths: msg.strengths || [],
            };
            if (existingIdx >= 0) {
              const updated = [...prev];
              updated[existingIdx] = { ...updated[existingIdx], ...genData };
              return updated;
            }
            return [...prev, genData];
          });
          break;

        case 'generation_begin':
          setPhase(EvolutionPhase.EVOLVING);
          setCurrentGeneration(msg.generation_num || 0);
          setStreamingText('');
          setCurrentMutation(null);
          break;

        case 'mutation_selected':
          setCurrentMutation({
            type: msg.mutation_type || null,
            reason: msg.reason || null,
            label: msg.mutation_label || null,
            description: msg.mutation_description || null,
          });
          break;

        case 'new_prompt_chunk':
          setPhase(EvolutionPhase.STREAMING);
          setStreamingText((prev) => prev + (msg.chunk || ''));
          break;

        case 'new_prompt_complete':
          setPhase(EvolutionPhase.MUTATING);
          setCurrentScores(msg.scores || emptyScores());
          setCurrentProvider(msg.llm_used || null);
          setEvolvedPrompt(msg.new_prompt || '');
          setGenerations((prev) => {
            const existingIdx = prev.findIndex(g => g.generation === msg.generation_num);
            const genData = {
              generation: msg.generation_num || prev.length,
              prompt: msg.new_prompt || streamingText,
              scores: prev[existingIdx]?.scores || emptyScores(),
              overallScore: msg.total_score ?? msg.best_score ?? 0,
              mutationType: msg.mutation_type || currentMutation?.type || null,
              mutationReason: currentMutation?.reason || null,
              provider: msg.llm_used || null,
              improvement: msg.improvement || 0,
            };
            if (existingIdx >= 0) {
              const updated = [...prev];
              updated[existingIdx] = { ...updated[existingIdx], ...genData };
              return updated;
            }
            return [...prev, genData];
          });
          setStreamingText('');
          break;

        case 'evolution_complete':
          setPhase(EvolutionPhase.COMPLETED);
          setEvolvedPrompt(msg.best_prompt || msg.final_prompt || evolvedPrompt);
          if (msg.final_scores) setCurrentScores(msg.final_scores);
          setBestGeneration(msg.best_generation ?? null);
          if (msg.generations && msg.generations.length > 0) {
            setGenerations(msg.generations.map(g => ({
              generation: g.generation_num ?? g.generation_number ?? g.generation,
              prompt: g.prompt_text ?? g.prompt ?? '',
              scores: g.scores || emptyScores(),
              overallScore: g.score ?? g.total ?? 0,
              mutationType: g.mutation_type || null,
              mutationReason: g.mutation_reason || null,
              provider: g.provider || g.llm_used || null,
            })));
          }
          isEvolvingRef.current = false;
          break;

        case 'llm_switched':
          setCurrentProvider(msg.to_llm || null);
          break;

        case 'evolution_error':
          setPhase(EvolutionPhase.ERROR);
          setError(msg.message || 'Unknown error occurred');
          isEvolvingRef.current = false;
          break;

        case 'evolution_cancelled':
          setPhase(EvolutionPhase.CANCELLED);
          isEvolvingRef.current = false;
          break;

        default:
          console.warn('[useEvolution] Unknown event type:', eventType, raw);
      }
    } catch (err) {
      console.error('[useEvolution] Message parse error:', err);
    }
  }, [originalPrompt, streamingText, evolvedPrompt, currentScores, currentMutation]);

  /* ────────────────────────────────────────────
     Connect / Disconnect
     ──────────────────────────────────────────── */

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setPhase(EvolutionPhase.CONNECTING);
    setError(null);

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        reconnectAttempts.current = 0;

        /* Start heartbeat */
        heartbeatRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: 'ping' }));
          }
        }, HEARTBEAT_INTERVAL);
      };

      ws.onmessage = handleMessage;

      ws.onerror = (e) => {
        console.error('[useEvolution] WebSocket error:', e);
        setError('Connection error');
      };

      ws.onclose = (e) => {
        setIsConnected(false);
        clearInterval(heartbeatRef.current);

        /* Reconnect if unexpectedly closed during evolution */
        if (isEvolvingRef.current && reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current += 1;
          reconnectTimer.current = setTimeout(() => {
            connect();
          }, RECONNECT_DELAY * reconnectAttempts.current);
        } else if (!isEvolvingRef.current) {
          if (phase !== EvolutionPhase.COMPLETED && phase !== EvolutionPhase.CANCELLED) {
            setPhase(EvolutionPhase.IDLE);
          }
        }
      };
    } catch (err) {
      console.error('[useEvolution] Failed to create WebSocket:', err);
      setError('Failed to connect');
      setPhase(EvolutionPhase.ERROR);
    }
  }, [handleMessage, phase]);

  const disconnect = useCallback(() => {
    isEvolvingRef.current = false;
    clearInterval(heartbeatRef.current);
    clearTimeout(reconnectTimer.current);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  /* ────────────────────────────────────────────
     Start Evolution
     ──────────────────────────────────────────── */

  const startEvolution = useCallback((prompt, maxGenerations = 5) => {
    setOriginalPrompt(prompt);
    setEvolvedPrompt('');
    setGenerations([]);
    setOriginalScores(emptyScores());
    setCurrentScores(emptyScores());
    setCurrentGeneration(0);
    setTotalGenerations(maxGenerations);
    setBestGeneration(null);
    setStreamingText('');
    setCurrentMutation(null);
    setCurrentProvider(null);
    setError(null);

    const send = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          action: 'start_evolution',
          prompt: prompt.trim(),
          max_generations: maxGenerations,
        }));
      }
    };

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      /* Connect first, then send */
      setPhase(EvolutionPhase.CONNECTING);

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        reconnectAttempts.current = 0;

        heartbeatRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: 'ping' }));
          }
        }, HEARTBEAT_INTERVAL);

        send();
      };

      ws.onmessage = handleMessage;

      ws.onerror = (e) => {
        console.error('[useEvolution] WebSocket error:', e);
        setError('Connection error');
        setPhase(EvolutionPhase.ERROR);
      };

      ws.onclose = () => {
        setIsConnected(false);
        clearInterval(heartbeatRef.current);
      };
    } else {
      send();
    }
  }, [handleMessage]);

  /* ────────────────────────────────────────────
     Cancel Evolution
     ──────────────────────────────────────────── */

  const cancelEvolution = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'cancel_evolution' }));
    }
    isEvolvingRef.current = false;
    setPhase(EvolutionPhase.CANCELLED);
  }, []);

  /* ────────────────────────────────────────────
     Reset to idle
     ──────────────────────────────────────────── */

  const reset = useCallback(() => {
    setPhase(EvolutionPhase.IDLE);
    setSessionId(null);
    setOriginalPrompt('');
    setEvolvedPrompt('');
    setOriginalScores(emptyScores());
    setCurrentScores(emptyScores());
    setGenerations([]);
    setCurrentGeneration(0);
    setTotalGenerations(0);
    setBestGeneration(null);
    setStreamingText('');
    setCurrentMutation(null);
    setCurrentProvider(null);
    setError(null);
  }, []);

  /* ────────────────────────────────────────────
     Fetch session history from REST API
     ──────────────────────────────────────────── */

  const fetchSession = useCallback(async (id) => {
    try {
      const res = await fetch(`${API_BASE}/sessions/${id}`);
      if (!res.ok) throw new Error('Session not found');
      const data = await res.json();

      setSessionId(data.id);
      setOriginalPrompt(data.original_prompt || '');
      setEvolvedPrompt(data.evolved_prompt || '');
      setTotalGenerations(data.max_generations || 0);
      setPhase(EvolutionPhase.COMPLETED);

      if (data.generations && data.generations.length > 0) {
        const gens = data.generations.map((g) => ({
          generation: g.generation_number,
          prompt: g.prompt_text,
          scores: g.scores || emptyScores(),
          overallScore: g.score ?? 0,
          mutationType: g.mutation_type || null,
          mutationReason: g.mutation_reason || null,
          provider: g.provider || null,
        }));

        setGenerations(gens);
        setOriginalScores(gens[0]?.scores || emptyScores());
        setCurrentScores(gens[gens.length - 1]?.scores || emptyScores());
        setBestGeneration(
          gens.reduce((best, g) =>
            (g.overallScore > (best?.overallScore ?? 0)) ? g : best,
            gens[0]
          )?.generation ?? null
        );
      }

      return data;
    } catch (err) {
      console.error('[useEvolution] fetchSession error:', err);
      setError(err.message);
      return null;
    }
  }, []);

  /* ────────────────────────────────────────────
     Fetch providers health
     ──────────────────────────────────────────── */

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (!res.ok) throw new Error('Health check failed');
      return await res.json();
    } catch (err) {
      console.error('[useEvolution] fetchProviders error:', err);
      return null;
    }
  }, []);

  /* ────────────────────────────────────────────
     Cleanup on unmount
     ──────────────────────────────────────────── */

  useEffect(() => {
    return () => {
      clearInterval(heartbeatRef.current);
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  /* ────────────────────────────────────────────
     Computed values
     ──────────────────────────────────────────── */

  const isEvolving = [
    EvolutionPhase.CONNECTING,
    EvolutionPhase.SCORING,
    EvolutionPhase.MUTATING,
    EvolutionPhase.EVOLVING,
    EvolutionPhase.STREAMING,
  ].includes(phase);

  const overallOriginal = calculateOverall(originalScores);
  const overallCurrent = calculateOverall(currentScores);
  const improvement = overallCurrent - overallOriginal;
  const progressPercent = totalGenerations > 0
    ? Math.round((currentGeneration / totalGenerations) * 100)
    : 0;

  /* ── Return ────────────────────────────────── */

  return {
    /* Connection */
    connect,
    disconnect,
    isConnected,

    /* Evolution controls */
    startEvolution,
    cancelEvolution,
    reset,

    /* Phase & status */
    phase,
    isEvolving,
    error,

    /* Session */
    sessionId,
    originalPrompt,
    evolvedPrompt,

    /* Scores */
    originalScores,
    currentScores,
    overallOriginal,
    overallCurrent,
    improvement,

    /* Generations */
    generations,
    currentGeneration,
    totalGenerations,
    bestGeneration,
    progressPercent,

    /* Streaming */
    streamingText,
    currentMutation,
    currentProvider,

    /* Data fetching */
    fetchSession,
    fetchProviders,
  };
}

/* ── Utility (same weights as backend) ───────── */

function calculateOverall(scores) {
  if (!scores) return 0;
  const w = { clarity: 0.25, specificity: 0.20, actionability: 0.20, conciseness: 0.20, creativity: 0.15 };
  let total = 0;
  Object.entries(w).forEach(([k, v]) => { total += (scores[k] ?? 0) * v; });
  return Math.round(total);
}
