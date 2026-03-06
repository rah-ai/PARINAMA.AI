/* ════════════════════════════════════════════════
   PARINAMA — useD3Tree Hook
   D3.js tree layout computation hook for the
   EvolutionTree visualization component
   ════════════════════════════════════════════════ */

import { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

/* ── Constants ───────────────────────────────── */

const DEFAULT_NODE_SIZE = { width: 90, height: 50 };
const DEFAULT_MARGINS = { top: 30, right: 40, bottom: 30, left: 40 };
const LINK_CURVE_FACTOR = 0.5;

/* ── Mutation Colors ─────────────────────────── */

const MUTATION_COLORS = {
  CLARIFY: '#d97706',
  EXPAND: '#22c55e',
  COMPRESS: '#3b82f6',
  REFRAME: '#a855f7',
  SPECIALIZE: '#ec4899',
  HUMANIZE: '#f97316',
  DEFAULT: '#78716c',
};

/* ══════════════════════════════════════════════
   HOOK — useD3Tree
   ══════════════════════════════════════════════ */

export default function useD3Tree(generations = [], containerSize = { width: 600, height: 400 }) {
  const svgRef = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);

  /* ────────────────────────────────────────────
     Build hierarchical data from flat generations
     ──────────────────────────────────────────── */

  const hierarchyData = useMemo(() => {
    if (!generations || generations.length === 0) {
      return {
        id: 'root',
        generation: 0,
        label: 'Start',
        score: 0,
        mutationType: null,
        children: [],
      };
    }

    /* Build linear chain: gen0 → gen1 → gen2 → ... */
    const root = {
      id: 'gen-0',
      generation: 0,
      label: 'Original',
      score: generations[0]?.overallScore ?? 0,
      scores: generations[0]?.scores ?? {},
      prompt: generations[0]?.prompt ?? '',
      mutationType: null,
      mutationReason: null,
      provider: generations[0]?.provider ?? null,
      children: [],
    };

    let current = root;

    for (let i = 1; i < generations.length; i++) {
      const gen = generations[i];
      const node = {
        id: `gen-${i}`,
        generation: i,
        label: `Gen ${i}`,
        score: gen?.overallScore ?? 0,
        scores: gen?.scores ?? {},
        prompt: gen?.prompt ?? '',
        mutationType: gen?.mutationType ?? null,
        mutationReason: gen?.mutationReason ?? null,
        provider: gen?.provider ?? null,
        children: [],
      };

      current.children.push(node);
      current = node;
    }

    return root;
  }, [generations]);

  /* ────────────────────────────────────────────
     Compute D3 tree layout
     ──────────────────────────────────────────── */

  const layout = useMemo(() => {
    const { width, height } = containerSize;
    const margins = DEFAULT_MARGINS;
    const innerWidth = Math.max(width - margins.left - margins.right, 100);
    const innerHeight = Math.max(height - margins.top - margins.bottom, 80);

    /* Create D3 hierarchy */
    const root = d3.hierarchy(hierarchyData);

    /* Tree layout — horizontal: root left → leaves right */
    const treeLayout = d3.tree().size([innerHeight, innerWidth]);
    treeLayout(root);

    /* Extract nodes and links */
    const nodes = root.descendants().map((d) => ({
      id: d.data.id,
      x: d.y + margins.left,           /* swap x/y for horizontal tree */
      y: d.x + margins.top,
      data: d.data,
      depth: d.depth,
      isLeaf: !d.children || d.children.length === 0,
      isRoot: d.depth === 0,
    }));

    const links = root.links().map((link) => ({
      source: {
        x: link.source.y + margins.left,
        y: link.source.x + margins.top,
      },
      target: {
        x: link.target.y + margins.left,
        y: link.target.x + margins.top,
      },
      mutationType: link.target.data.mutationType,
    }));

    return { nodes, links, width, height, margins };
  }, [hierarchyData, containerSize]);

  /* ────────────────────────────────────────────
     Generate SVG path for links (cubic bezier)
     ──────────────────────────────────────────── */

  const getLinkPath = useCallback((link) => {
    const { source, target } = link;
    const midX = source.x + (target.x - source.x) * LINK_CURVE_FACTOR;

    return `M ${source.x},${source.y}
            C ${midX},${source.y}
              ${midX},${target.y}
              ${target.x},${target.y}`;
  }, []);

  /* ────────────────────────────────────────────
     Get link color based on mutation type
     ──────────────────────────────────────────── */

  const getLinkColor = useCallback((mutationType) => {
    if (!mutationType) return MUTATION_COLORS.DEFAULT;
    return MUTATION_COLORS[mutationType.toUpperCase()] || MUTATION_COLORS.DEFAULT;
  }, []);

  /* ────────────────────────────────────────────
     Get node color based on score
     ──────────────────────────────────────────── */

  const getNodeColor = useCallback((score) => {
    if (score >= 90) return '#22c55e';    /* excellent — green */
    if (score >= 75) return '#84cc16';    /* good — lime */
    if (score >= 60) return '#d97706';    /* decent — amber */
    if (score >= 40) return '#f97316';    /* moderate — orange */
    return '#ef4444';                     /* needs work — red */
  }, []);

  /* ────────────────────────────────────────────
     Get node radius based on score
     ──────────────────────────────────────────── */

  const getNodeRadius = useCallback((node) => {
    const baseRadius = 18;
    const scoreBonus = (node.data.score / 100) * 6;
    if (node.isRoot) return baseRadius + 4;
    if (node.isLeaf) return baseRadius + scoreBonus + 2;
    return baseRadius + scoreBonus;
  }, []);

  /* ────────────────────────────────────────────
     Get link midpoint for mutation label
     ──────────────────────────────────────────── */

  const getLinkMidpoint = useCallback((link) => {
    return {
      x: (link.source.x + link.target.x) / 2,
      y: (link.source.y + link.target.y) / 2 - 12,
    };
  }, []);

  /* ────────────────────────────────────────────
     Tooltip data for a node
     ──────────────────────────────────────────── */

  const getTooltipData = useCallback((node) => {
    if (!node) return null;

    const d = node.data;
    const dims = d.scores || {};
    return {
      label: d.label,
      generation: d.generation,
      score: d.score,
      prompt: d.prompt ? (d.prompt.length > 120 ? d.prompt.slice(0, 120) + '…' : d.prompt) : '',
      mutationType: d.mutationType,
      mutationReason: d.mutationReason,
      provider: d.provider,
      dimensions: {
        Clarity: dims.clarity ?? 0,
        Specificity: dims.specificity ?? 0,
        Actionability: dims.actionability ?? 0,
        Conciseness: dims.conciseness ?? 0,
        Creativity: dims.creativity ?? 0,
      },
    };
  }, []);

  /* ────────────────────────────────────────────
     Best node (highest score)
     ──────────────────────────────────────────── */

  const bestNode = useMemo(() => {
    if (layout.nodes.length === 0) return null;
    return layout.nodes.reduce((best, node) =>
      (node.data.score > (best?.data?.score ?? 0)) ? node : best,
      layout.nodes[0]
    );
  }, [layout.nodes]);

  /* ────────────────────────────────────────────
     Score delta between consecutive nodes
     ──────────────────────────────────────────── */

  const getScoreDelta = useCallback((nodeId) => {
    const idx = layout.nodes.findIndex((n) => n.id === nodeId);
    if (idx <= 0) return null;
    const current = layout.nodes[idx].data.score;
    const previous = layout.nodes[idx - 1].data.score;
    return current - previous;
  }, [layout.nodes]);

  /* ────────────────────────────────────────────
     Zoom/Pan D3 behavior (imperative)
     ──────────────────────────────────────────── */

  const zoomBehavior = useRef(null);

  const initZoom = useCallback((svgElement, gElement) => {
    if (!svgElement || !gElement) return;

    const zoom = d3.zoom()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        d3.select(gElement).attr('transform', event.transform);
      });

    d3.select(svgElement).call(zoom);
    zoomBehavior.current = zoom;

    return () => {
      d3.select(svgElement).on('.zoom', null);
    };
  }, []);

  const resetZoom = useCallback(() => {
    if (!svgRef.current || !zoomBehavior.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(500)
      .call(zoomBehavior.current.transform, d3.zoomIdentity);
  }, []);

  const fitToView = useCallback(() => {
    if (!svgRef.current || !zoomBehavior.current || layout.nodes.length === 0) return;

    const { width, height } = containerSize;
    const xExtent = d3.extent(layout.nodes, (n) => n.x);
    const yExtent = d3.extent(layout.nodes, (n) => n.y);

    const dataWidth = (xExtent[1] - xExtent[0]) || 100;
    const dataHeight = (yExtent[1] - yExtent[0]) || 100;

    const scale = Math.min(
      (width - 60) / dataWidth,
      (height - 60) / dataHeight,
      1.5
    );

    const centerX = (xExtent[0] + xExtent[1]) / 2;
    const centerY = (yExtent[0] + yExtent[1]) / 2;

    const transform = d3.zoomIdentity
      .translate(width / 2, height / 2)
      .scale(scale)
      .translate(-centerX, -centerY);

    d3.select(svgRef.current)
      .transition()
      .duration(600)
      .call(zoomBehavior.current.transform, transform);
  }, [containerSize, layout.nodes]);

  /* ────────────────────────────────────────────
     Auto fit on data change
     ──────────────────────────────────────────── */

  useEffect(() => {
    if (layout.nodes.length > 1) {
      const timer = setTimeout(fitToView, 200);
      return () => clearTimeout(timer);
    }
  }, [layout.nodes.length, fitToView]);

  /* ── Return ────────────────────────────────── */

  return {
    /* Refs */
    svgRef,

    /* Layout data */
    layout,
    hierarchyData,

    /* Path generators */
    getLinkPath,
    getLinkColor,
    getLinkMidpoint,

    /* Node helpers */
    getNodeColor,
    getNodeRadius,
    getScoreDelta,
    getTooltipData,
    bestNode,

    /* Interaction */
    hoveredNode,
    setHoveredNode,
    selectedNode,
    setSelectedNode,

    /* Zoom */
    initZoom,
    resetZoom,
    fitToView,

    /* Constants */
    MUTATION_COLORS,
  };
}
