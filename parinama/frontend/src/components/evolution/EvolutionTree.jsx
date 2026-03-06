/* ════════════════════════════════════════════════
   PARINAMA — EvolutionTree Component
   D3.js tree visualization of the evolution path
   ════════════════════════════════════════════════ */

import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as d3 from 'd3';
import { MUTATION_CONFIG } from './MutationBadge';

/* ── Score Color ─────────────────────────────── */

function getScoreColor(score) {
  if (score >= 80) return '#22c55e'; /* green */
  if (score >= 60) return '#d97706'; /* amber */
  if (score >= 40) return '#c2410c'; /* terracotta */
  return '#e11d48';                  /* rose */
}

function getMutationColor(type) {
  const config = MUTATION_CONFIG[type?.toUpperCase()];
  return config ? config.color : '#8B7355';
}

/* ── Tree Data Transformer ───────────────────── */

function buildTreeData(generations) {
  if (!generations || generations.length === 0) {
    return { name: 'Empty', generation: 0, score: 0, children: [] };
  }

  /* Build linear chain: Gen 0 → Gen 1 → Gen 2 → ... */
  const root = {
    name: `Gen 0`,
    generation: 0,
    score: generations[0]?.overallScore ?? 0,
    scores: generations[0]?.scores ?? {},
    prompt: generations[0]?.prompt ?? '',
    mutationType: null,
    children: [],
  };

  let current = root;
  for (let i = 1; i < generations.length; i++) {
    const gen = generations[i];
    const child = {
      name: `Gen ${i}`,
      generation: i,
      score: gen.overallScore ?? 0,
      scores: gen.scores ?? {},
      prompt: gen.prompt ?? '',
      mutationType: gen.mutationType ?? null,
      children: [],
    };
    current.children.push(child);
    current = child;
  }

  return root;
}

/* ── Node Tooltip ────────────────────────────── */

function NodeTooltip({ node, position, visible }) {
  if (!visible || !node) return null;

  const score = node.data?.score ?? 0;
  const prompt = node.data?.prompt ?? '';
  const mutation = node.data?.mutationType;
  const gen = node.data?.generation ?? 0;
  const truncatedPrompt = prompt.length > 120
    ? prompt.slice(0, 118) + '…'
    : prompt;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 4, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'absolute',
            left: position.x,
            top: position.y,
            transform: 'translate(-50%, -100%)',
            marginTop: '-12px',
            zIndex: 50,
            pointerEvents: 'none',
            maxWidth: '280px',
            width: 'max-content',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--tooltip-bg, #1a1a1a)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '0.625rem 0.75rem',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
                marginBottom: '0.375rem',
              }}
            >
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                {gen === 0 ? 'Original' : `Generation ${gen}`}
              </span>

              <span
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: getScoreColor(score),
                }}
              >
                {score}
              </span>
            </div>

            {/* Mutation type */}
            {mutation && (
              <div
                style={{
                  display: 'inline-block',
                  padding: '0.125rem 0.375rem',
                  borderRadius: '3px',
                  backgroundColor: getMutationColor(mutation) + '18',
                  border: `1px solid ${getMutationColor(mutation)}40`,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.625rem',
                  fontWeight: 600,
                  color: getMutationColor(mutation),
                  marginBottom: '0.375rem',
                }}
              >
                {mutation}
              </div>
            )}

            {/* Prompt preview */}
            {truncatedPrompt && (
              <p
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: '0.6875rem',
                  lineHeight: 1.5,
                  color: 'var(--text-secondary, #a0a0a0)',
                  margin: 0,
                  wordBreak: 'break-word',
                }}
              >
                {truncatedPrompt}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ══════════════════════════════════════════════
   MAIN — EvolutionTree Component
   ══════════════════════════════════════════════ */

export default function EvolutionTree({
  generations = [],
  activeGeneration = null,
  bestGeneration = null,
  width = 600,
  height = 400,
  orientation = 'horizontal', /* horizontal | vertical */
  onNodeClick = null,
  className = '',
  style: externalStyle = {},
}) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [tooltip, setTooltip] = useState({ visible: false, node: null, position: { x: 0, y: 0 } });
  const [dimensions, setDimensions] = useState({ width, height });

  /* Build D3 tree hierarchy */
  const treeData = useMemo(() => buildTreeData(generations), [generations]);

  /* Responsive sizing */
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          setDimensions({ width: w, height: Math.max(h, 200) });
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  /* Render D3 tree */
  useEffect(() => {
    if (!svgRef.current || generations.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width: w, height: h } = dimensions;
    const margin = { top: 40, right: 60, bottom: 40, left: 60 };
    const innerWidth = w - margin.left - margin.right;
    const innerHeight = h - margin.top - margin.bottom;

    /* Create hierarchy */
    const root = d3.hierarchy(treeData);

    /* Layout */
    const isHorizontal = orientation === 'horizontal';
    const treeLayout = d3.tree().size(
      isHorizontal ? [innerHeight, innerWidth] : [innerWidth, innerHeight]
    );
    treeLayout(root);

    /* Main group */
    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    /* ── Links (curved paths) ────────────────── */

    const linkGenerator = isHorizontal
      ? d3.linkHorizontal().x(d => d.y).y(d => d.x)
      : d3.linkVertical().x(d => d.x).y(d => d.y);

    const links = g
      .selectAll('.tree-link')
      .data(root.links())
      .enter()
      .append('path')
      .attr('class', 'tree-link')
      .attr('d', linkGenerator)
      .attr('fill', 'none')
      .attr('stroke', d => {
        const targetMut = d.target.data?.mutationType;
        return targetMut ? getMutationColor(targetMut) : 'var(--border)';
      })
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.5)
      .attr('stroke-linecap', 'round');

    /* Animate links drawing */
    links.each(function () {
      const path = d3.select(this);
      const totalLength = this.getTotalLength();
      path
        .attr('stroke-dasharray', totalLength)
        .attr('stroke-dashoffset', totalLength)
        .transition()
        .duration(600)
        .delay((_, i) => i * 150)
        .ease(d3.easeQuadOut)
        .attr('stroke-dashoffset', 0);
    });

    /* ── Nodes ───────────────────────────────── */

    const nodes = g
      .selectAll('.tree-node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', 'tree-node')
      .attr('transform', d =>
        isHorizontal
          ? `translate(${d.y}, ${d.x})`
          : `translate(${d.x}, ${d.y})`
      )
      .style('cursor', 'pointer');

    /* Node background circle (glow for active/best) */
    nodes
      .filter(d => d.data.generation === activeGeneration || d.data.generation === bestGeneration)
      .append('circle')
      .attr('r', 18)
      .attr('fill', 'none')
      .attr('stroke', d =>
        d.data.generation === bestGeneration
          ? '#22c55e'
          : '#d97706'
      )
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.3)
      .attr('stroke-dasharray', '3,3');

    /* Main node circle */
    nodes
      .append('circle')
      .attr('r', 0)
      .attr('fill', d => {
        const score = d.data.score ?? 0;
        return getScoreColor(score);
      })
      .attr('stroke', 'var(--bg-card)')
      .attr('stroke-width', 2.5)
      .attr('opacity', 0)
      .transition()
      .duration(400)
      .delay((_, i) => 200 + i * 120)
      .ease(d3.easeBackOut.overshoot(1.5))
      .attr('r', d => {
        if (d.data.generation === bestGeneration) return 14;
        if (d.data.generation === activeGeneration) return 13;
        return 11;
      })
      .attr('opacity', 1);

    /* Score text inside node */
    nodes
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('opacity', 0)
      .style('font-family', "'Playfair Display', serif")
      .style('font-size', d =>
        d.data.generation === bestGeneration ? '10px' : '9px'
      )
      .style('font-weight', '700')
      .style('fill', 'white')
      .style('pointer-events', 'none')
      .text(d => d.data.score ?? '')
      .transition()
      .duration(300)
      .delay((_, i) => 400 + i * 120)
      .attr('opacity', 1);

    /* Generation label below node */
    nodes
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', isHorizontal ? '2em' : '2.2em')
      .attr('opacity', 0)
      .style('font-family', "'Inter', sans-serif")
      .style('font-size', '8px')
      .style('font-weight', '600')
      .style('fill', 'var(--text-muted)')
      .style('text-transform', 'uppercase')
      .style('letter-spacing', '0.06em')
      .text(d => d.data.generation === 0 ? 'ORIG' : `G${d.data.generation}`)
      .transition()
      .duration(300)
      .delay((_, i) => 500 + i * 100)
      .attr('opacity', 0.7);

    /* Mutation label on links */
    const linkMidpoints = root.links().map((link, i) => {
      const sx = isHorizontal ? link.source.y : link.source.x;
      const sy = isHorizontal ? link.source.x : link.source.y;
      const tx = isHorizontal ? link.target.y : link.target.x;
      const ty = isHorizontal ? link.target.x : link.target.y;
      return {
        x: (sx + tx) / 2,
        y: (sy + ty) / 2,
        mutation: link.target.data?.mutationType,
        index: i,
      };
    });

    g.selectAll('.mutation-label')
      .data(linkMidpoints.filter(d => d.mutation))
      .enter()
      .append('text')
      .attr('class', 'mutation-label')
      .attr('x', d => d.x)
      .attr('y', d => d.y - 8)
      .attr('text-anchor', 'middle')
      .attr('opacity', 0)
      .style('font-family', "'DM Mono', monospace")
      .style('font-size', '7px')
      .style('font-weight', '500')
      .style('fill', d => getMutationColor(d.mutation))
      .text(d => d.mutation?.toLowerCase())
      .transition()
      .duration(300)
      .delay((_, i) => 700 + i * 100)
      .attr('opacity', 0.6);

    /* ── Hover Interactions ──────────────────── */

    nodes
      .on('mouseenter', function (event, d) {
        d3.select(this).select('circle:nth-child(2), circle:first-child')
          .transition()
          .duration(150)
          .attr('r', function () {
            return +d3.select(this).attr('r') + 2;
          });

        const containerRect = containerRef.current?.getBoundingClientRect();
        if (containerRect) {
          setTooltip({
            visible: true,
            node: d,
            position: {
              x: event.clientX - containerRect.left,
              y: event.clientY - containerRect.top,
            },
          });
        }
      })
      .on('mouseleave', function () {
        d3.select(this).selectAll('circle')
          .transition()
          .duration(150)
          .attr('r', function (d) {
            if (!d) return 11;
            if (d.data?.generation === bestGeneration) return 14;
            if (d.data?.generation === activeGeneration) return 13;
            return 11;
          });

        setTooltip({ visible: false, node: null, position: { x: 0, y: 0 } });
      })
      .on('click', function (event, d) {
        onNodeClick?.(d.data);
      });

  }, [generations, dimensions, orientation, activeGeneration, bestGeneration, treeData, onNodeClick]);

  /* ── Empty State ───────────────────────────── */

  if (generations.length === 0) {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '200px',
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
          Evolution tree will appear here
        </span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`evolution-tree ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        height: `${height}px`,
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
          padding: '0.5rem 0.75rem',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--bg-surface)',
        }}
      >
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
          Evolution Path
        </span>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          {/* Legend items */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#d97706' }} />
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.5625rem', color: 'var(--text-muted)' }}>
              active
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.5625rem', color: 'var(--text-muted)' }}>
              best
            </span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height - 36}
        style={{ display: 'block' }}
      />

      {/* Tooltip */}
      <NodeTooltip
        node={tooltip.node}
        position={tooltip.position}
        visible={tooltip.visible}
      />
    </div>
  );
}

/* ── Compact tree for results summary ────────── */

export function CompactEvolutionTree({
  generations = [],
  bestGeneration = null,
  height = 200,
}) {
  return (
    <EvolutionTree
      generations={generations}
      bestGeneration={bestGeneration}
      height={height}
      orientation="horizontal"
    />
  );
}
