// ════════════════════════════════════════════════
// PARINAMA — Zustand Global Store
// Central state management for the entire app
// ════════════════════════════════════════════════

import { create } from 'zustand';

// ── Screen States ────────────────────────────
// 'landing'    → Initial prompt input screen
// 'evolving'   → Evolution in progress
// 'results'    → Final results display

const initialState = {
  // ── Screen Navigation ──────────────────────
  currentScreen: 'landing',

  // ── Prompt Data ────────────────────────────
  originalPrompt: '',
  maxGenerations: 5,
  scoreThreshold: 90,

  // ── Evolution State ────────────────────────
  sessionId: null,
  isEvolving: false,
  isConnected: false,
  currentGenerationNum: 0,

  // ── Generations Array ──────────────────────
  // Each generation: {
  //   generation_num, prompt_text, scores, feedback,
  //   weaknesses, strengths, mutation_type, mutation_info,
  //   improvement_delta, llm_used, badge_color, processing_time_ms
  // }
  generations: [],

  // ── Current Generation Live Data ───────────
  activeGeneration: null,
  streamingText: '',
  isStreaming: false,
  currentScores: null,
  currentMutation: null,
  currentWeaknesses: [],

  // ── Best Result ────────────────────────────
  bestPrompt: '',
  bestScore: 0,
  initialScore: 0,
  improvement: 0,
  bestGeneration: null,

  // ── LLM Tracking ──────────────────────────
  currentLLM: '',
  currentBadgeColor: '',
  llmSwitches: [],

  // ── Results Data ───────────────────────────
  evolutionComplete: false,
  totalTimeMs: 0,
  totalLLMSwitches: 0,

  // ── Error State ────────────────────────────
  error: null,

  // ── UI State ───────────────────────────────
  selectedGenerationNode: null,
  isExportPanelOpen: false,
};

const useStore = create((set, get) => ({
  ...initialState,

  // ══════════════════════════════════════════
  // NAVIGATION ACTIONS
  // ══════════════════════════════════════════

  setScreen: (screen) => set({ currentScreen: screen }),

  goToLanding: () => set({
    ...initialState,
    currentScreen: 'landing',
  }),

  goToEvolving: () => set({ currentScreen: 'evolving' }),

  goToResults: () => set({ currentScreen: 'results' }),

  // ══════════════════════════════════════════
  // PROMPT CONFIGURATION
  // ══════════════════════════════════════════

  setOriginalPrompt: (prompt) => set({ originalPrompt: prompt }),

  setMaxGenerations: (count) => set({ maxGenerations: count }),

  setScoreThreshold: (threshold) => set({ scoreThreshold: threshold }),

  // ══════════════════════════════════════════
  // CONNECTION STATE
  // ══════════════════════════════════════════

  setConnected: (connected) => set({ isConnected: connected }),

  setSessionId: (id) => set({ sessionId: id }),

  // ══════════════════════════════════════════
  // EVOLUTION EVENT HANDLERS
  // These are called by the useEvolution hook
  // when WebSocket events arrive
  // ══════════════════════════════════════════

  // ── evolution_started ──────────────────────
  handleEvolutionStarted: (data) => set({
    isEvolving: true,
    currentScreen: 'evolving',
    sessionId: data.session_id || null,
    originalPrompt: data.prompt || get().originalPrompt,
    maxGenerations: data.max_generations || get().maxGenerations,
    generations: [],
    streamingText: '',
    error: null,
    evolutionComplete: false,
    llmSwitches: [],
  }),

  // ── generation_begin ───────────────────────
  handleGenerationBegin: (data) => set({
    currentGenerationNum: data.generation_num,
    streamingText: '',
    isStreaming: true,
    currentScores: null,
    currentMutation: null,
    currentWeaknesses: [],
    activeGeneration: {
      generation_num: data.generation_num,
      prompt_text: data.current_prompt,
    },
  }),

  // ── scoring_complete ───────────────────────
  handleScoringComplete: (data) => {
    const state = get();
    const genNum = data.generation_num;

    // Update the generation in the array if it exists
    const updatedGenerations = [...state.generations];
    const existingIdx = updatedGenerations.findIndex(
      (g) => g.generation_num === genNum
    );

    const genData = {
      generation_num: genNum,
      prompt_text: existingIdx >= 0
        ? updatedGenerations[existingIdx].prompt_text
        : state.activeGeneration?.prompt_text || '',
      scores: data.scores,
      feedback: data.feedback || {},
      weaknesses: data.weaknesses || [],
      strengths: data.strengths || [],
      llm_used: data.llm_used || state.currentLLM,
      badge_color: data.badge_color || state.currentBadgeColor,
    };

    if (existingIdx >= 0) {
      updatedGenerations[existingIdx] = {
        ...updatedGenerations[existingIdx],
        ...genData,
      };
    } else {
      updatedGenerations.push(genData);
    }

    set({
      generations: updatedGenerations,
      currentScores: data.scores,
      currentWeaknesses: data.weaknesses || [],
      currentLLM: data.llm_used || state.currentLLM,
      currentBadgeColor: data.badge_color || state.currentBadgeColor,
    });
  },

  // ── mutation_selected ──────────────────────
  handleMutationSelected: (data) => set({
    currentMutation: {
      type: data.mutation_type,
      label: data.mutation_label,
      description: data.mutation_description,
      icon: data.mutation_icon,
      color: data.mutation_color,
      reason: data.reason,
      targets: data.targets || [],
    },
    streamingText: '',
    isStreaming: true,
  }),

  // ── new_prompt_chunk ───────────────────────
  handleNewPromptChunk: (data) => set((state) => ({
    streamingText: state.streamingText + data.chunk,
  })),

  // ── new_prompt_complete ────────────────────
  handleNewPromptComplete: (data) => {
    const state = get();
    const genNum = data.generation_num;

    const updatedGenerations = [...state.generations];
    const existingIdx = updatedGenerations.findIndex(
      (g) => g.generation_num === genNum
    );

    const genUpdate = {
      generation_num: genNum,
      prompt_text: data.new_prompt,
      improvement_delta: data.improvement || 0,
      llm_used: data.llm_used || state.currentLLM,
      badge_color: data.badge_color || state.currentBadgeColor,
      mutation_type: data.mutation_type || state.currentMutation?.type || null,
      mutation_info: state.currentMutation || null,
      scores: existingIdx >= 0 ? updatedGenerations[existingIdx].scores : state.currentScores,
      weaknesses: existingIdx >= 0 ? updatedGenerations[existingIdx].weaknesses : state.currentWeaknesses,
    };

    if (existingIdx >= 0) {
      updatedGenerations[existingIdx] = {
        ...updatedGenerations[existingIdx],
        ...genUpdate,
      };
    } else {
      updatedGenerations.push(genUpdate);
    }

    // Track best
    const totalScore = data.total_score || data.best_score || 0;
    const currentBest = state.bestScore;

    set({
      generations: updatedGenerations,
      isStreaming: false,
      streamingText: data.new_prompt,
      currentLLM: data.llm_used || state.currentLLM,
      currentBadgeColor: data.badge_color || state.currentBadgeColor,
      bestScore: totalScore > currentBest ? totalScore : currentBest,
      bestPrompt: totalScore > currentBest ? data.new_prompt : state.bestPrompt,
    });
  },

  // ── llm_switched ───────────────────────────
  handleLLMSwitched: (data) => set((state) => ({
    llmSwitches: [
      ...state.llmSwitches,
      {
        from: data.from_llm,
        to: data.to_llm,
        reason: data.reason,
        timestamp: Date.now(),
      },
    ],
    currentLLM: data.to_llm,
  })),

  // ── evolution_complete ─────────────────────
  handleEvolutionComplete: (data) => {
    const state = get();

    // Find the best generation
    let bestGen = null;
    if (data.generations && data.generations.length > 0) {
      bestGen = data.generations.reduce((best, gen) => {
        const genScore = gen.scores?.total || 0;
        const bestScore = best?.scores?.total || 0;
        return genScore > bestScore ? gen : best;
      }, data.generations[0]);
    } else if (data.best_generation) {
      bestGen = data.best_generation;
    }

    set({
      isEvolving: false,
      evolutionComplete: true,
      currentScreen: 'results',
      bestPrompt: data.best_prompt || state.bestPrompt,
      bestScore: data.best_score || state.bestScore,
      initialScore: data.initial_score || (state.generations[0]?.scores?.total || 0),
      improvement: data.improvement || 0,
      totalTimeMs: data.total_time_ms || 0,
      totalLLMSwitches: data.llm_switches || state.llmSwitches.length,
      bestGeneration: bestGen,
      generations: data.generations && data.generations.length > 0
        ? data.generations
        : state.generations,
      isStreaming: false,
      sessionId: data.session_id || state.sessionId,
    });
  },

  // ── evolution_error ────────────────────────
  handleEvolutionError: (data) => set({
    error: data.message || 'An unexpected error occurred',
    isEvolving: false,
    isStreaming: false,
  }),

  // ══════════════════════════════════════════
  // UI ACTIONS
  // ══════════════════════════════════════════

  selectGenerationNode: (genNum) => set({ selectedGenerationNode: genNum }),

  toggleExportPanel: () => set((state) => ({
    isExportPanelOpen: !state.isExportPanelOpen,
  })),

  clearError: () => set({ error: null }),

  // ══════════════════════════════════════════
  // RESET
  // ══════════════════════════════════════════

  resetAll: () => set({ ...initialState }),

  resetEvolution: () => set({
    isEvolving: false,
    isConnected: false,
    currentGenerationNum: 0,
    generations: [],
    activeGeneration: null,
    streamingText: '',
    isStreaming: false,
    currentScores: null,
    currentMutation: null,
    currentWeaknesses: [],
    bestPrompt: '',
    bestScore: 0,
    initialScore: 0,
    improvement: 0,
    bestGeneration: null,
    currentLLM: '',
    currentBadgeColor: '',
    llmSwitches: [],
    evolutionComplete: false,
    totalTimeMs: 0,
    totalLLMSwitches: 0,
    error: null,
    selectedGenerationNode: null,
    isExportPanelOpen: false,
    sessionId: null,
  }),

  // ══════════════════════════════════════════
  // COMPUTED / DERIVED STATE HELPERS
  // ══════════════════════════════════════════

  getGenerationByNum: (num) => {
    const state = get();
    return state.generations.find((g) => g.generation_num === num) || null;
  },

  getScoreProgression: () => {
    const state = get();
    return state.generations
      .filter((g) => g.scores)
      .map((g) => ({
        generation: `Gen ${g.generation_num}`,
        generationNum: g.generation_num,
        total: g.scores.total || 0,
        clarity: g.scores.clarity || 0,
        specificity: g.scores.specificity || 0,
        actionability: g.scores.actionability || 0,
        conciseness: g.scores.conciseness || 0,
        creativity: g.scores.creativity || 0,
      }));
  },

  getTreeData: () => {
    const state = get();
    if (state.generations.length === 0) return null;

    const buildNode = (gen) => ({
      id: `gen-${gen.generation_num}`,
      name: `Gen ${gen.generation_num}`,
      score: gen.scores?.total || 0,
      prompt_preview: (gen.prompt_text || '').substring(0, 80),
      mutation_type: gen.mutation_type || null,
      llm_used: gen.llm_used || '',
      badge_color: gen.badge_color || '',
      improvement: gen.improvement_delta || 0,
    });

    const root = buildNode(state.generations[0]);
    let current = root;

    for (let i = 1; i < state.generations.length; i++) {
      const child = buildNode(state.generations[i]);
      current.children = [child];
      current = child;
    }

    return root;
  },
}));

export default useStore;
