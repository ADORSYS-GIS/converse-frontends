'use client';

import {
  Background,
  Controls,
  type Edge,
  MiniMap,
  type Node,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  RELATION_STYLE,
  relationKind,
  SELECTION_COLOR,
  SYMBOL_KIND_STYLE,
  symbolKind,
} from '../../lib/domain/graph';
import type { GraphResponse } from '../../lib/server/admin';
import { GRAPH_NODE_WIDTH, layoutGraph } from './layout';

const CANVAS_MIN_HEIGHT = 400;
const CANVAS_DEFAULT_HEIGHT = 600;
/** Breathing room below the canvas so it doesn't butt against the viewport's bottom edge. */
const CANVAS_BOTTOM_MARGIN = 24;

/** Tracks the viewport height so the canvas can size itself to fill the space below it. */
function useFillViewportHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState(CANVAS_DEFAULT_HEIGHT);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function measure() {
      if (!el) return;
      const available = window.innerHeight - el.getBoundingClientRect().top - CANVAS_BOTTOM_MARGIN;
      setHeight(Math.max(CANVAS_MIN_HEIGHT, Math.round(available)));
    }

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  return { ref, height };
}

/** Recomputes just a node's border color for the current selection — the only per-node thing that
 *  needs to change when `selectedNodeId` changes, so this is the only thing selection is allowed
 *  to touch (never position, which layout owns exclusively). */
function withSelectionBorder(node: Node, selectedNodeId: string | undefined): Node['style'] {
  const color = (node.data as { color?: string }).color ?? SELECTION_COLOR;
  const border = node.id === selectedNodeId ? SELECTION_COLOR : color;
  return { ...node.style, border: `2px solid ${border}` };
}

/**
 * The `@xyflow/react` canvas: turns a `GraphResponse` into a dagre-laid-out, kind-styled,
 * relation-styled diagram. Purely a renderer — all data fetching and interaction state (which
 * node is selected, browse vs. similar mode) lives in the parent panel; this component only
 * calls back on a node click. A long symbol name is clipped with an ellipsis and offered as a
 * hover tooltip instead of being left to overflow the node box.
 */
export function CodeGraphCanvas({
  data,
  selectedNodeId,
  onNodeSelect,
}: {
  data: GraphResponse;
  selectedNodeId?: string;
  onNodeSelect: (nodeId: string) => void;
}) {
  // Deliberately keyed on `data` alone, not `selectedNodeId`: dagre layout is expensive-ish and,
  // more importantly, re-running it on every click would blow away wherever the user just dragged
  // a node to. Selection highlighting is applied afterward, as a style patch (below).
  const { flowNodes, flowEdges } = useMemo(() => {
    const rawNodes: Node[] = data.nodes.map((n) => {
      const kind = symbolKind(n.label);
      const style = SYMBOL_KIND_STYLE[kind];
      return {
        id: n.node_id,
        data: { label: n.label, color: style.color },
        position: { x: 0, y: 0 },
        // Inline styles, not a Tailwind className: `@xyflow/react`'s own stylesheet
        // (`react-flow__node-default`) ships a `background: white` rule that wins the cascade over
        // a utility class regardless of specificity — inline styles are the only reliable override.
        style: {
          width: GRAPH_NODE_WIDTH,
          borderRadius: 8,
          border: `2px solid ${style.color}`,
          background: 'var(--color-surface)',
          color: 'var(--color-ink)',
          fontSize: 12,
          fontFamily: 'var(--font-mono)',
          padding: '6px 10px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        },
        domAttributes: { title: `${n.label}\n${n.source_file}:${n.start_line}` },
      };
    });

    const rawEdges: Edge[] = data.edges.map((e, i) => {
      const kind = relationKind(e.relation);
      const style = RELATION_STYLE[kind];
      // `contains` is structural scaffolding, not the interesting signal — rendered thin,
      // translucent, and arrowless so it recedes into the background instead of dominating the
      // view.
      const isStructural = kind === 'contains';
      return {
        id: `${e.source}->${e.target}-${i}`,
        source: e.source,
        target: e.target,
        style: {
          stroke: style.stroke,
          strokeWidth: isStructural ? 1 : 2,
          opacity: isStructural ? 0.35 : 0.9,
        },
        markerEnd: isStructural ? undefined : { type: 'arrowclosed' as const, color: style.stroke },
      };
    });

    return { flowNodes: layoutGraph(rawNodes, rawEdges), flowEdges: rawEdges };
  }, [data]);

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);
  const { ref: containerRef, height } = useFillViewportHeight<HTMLDivElement>();

  useEffect(() => {
    // `selectedNodeId` is read here (so a refresh while a node is selected doesn't visually lose
    // the highlight) but intentionally left out of the dependency array below: this effect should
    // fire on a new graph, not on every selection change — the effect after it handles selection
    // without resetting positions.
    setNodes(flowNodes.map((n) => ({ ...n, style: withSelectionBorder(n, selectedNodeId) })));
    setEdges(flowEdges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowNodes, flowEdges, setNodes, setEdges]);

  useEffect(() => {
    // Selection-only change: patch the border on whatever's currently rendered — including any
    // position the user just dragged a node to — instead of resetting from `flowNodes`.
    setNodes((current) =>
      current.map((n) => ({ ...n, style: withSelectionBorder(n, selectedNodeId) }))
    );
  }, [selectedNodeId, setNodes]);

  return (
    <div
      ref={containerRef}
      className="border-border w-full overflow-hidden rounded-lg border"
      style={{ height }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => onNodeSelect(node.id)}
        fitView
        proOptions={{ hideAttribution: true }}>
        <Background />
        <MiniMap
          pannable
          zoomable
          className="!bg-surface"
          nodeColor={(node) => (node.data as { color?: string }).color ?? SELECTION_COLOR}
        />
        <Controls />
      </ReactFlow>
    </div>
  );
}
