'use client';

import { Button } from '@lightbridge/ui-web/src/components/button';
import { Card } from '@lightbridge/ui-web/src/components/card';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { META_CLASS } from '@lightbridge/ui-web/src/lib/type-roles';
import { useMemo, useState } from 'react';

import { RELATION_STYLE, SYMBOL_KIND_STYLE } from '../../lib/domain/graph';
import { CodeGraphCanvas } from './code-graph-canvas';
import { type InspectorNotice, NodeInspector } from './node-inspector';
import { type GraphErrorCode, type GraphMode, useCodeGraph } from './use-code-graph';

/** One short line per `GraphErrorCode` — a reason code is never rendered as raw UI text.
 *  `no_embedding`/`unavailable` stay `muted` (an expected outcome, not a failure); the rest read
 *  `attention`. */
const ERROR_COPY: Record<GraphErrorCode, InspectorNotice> = {
  no_embedding: { tone: 'muted', message: 'No stored embedding for this symbol yet.' },
  not_found: { tone: 'attention', message: 'Repository not found.' },
  unauthenticated: { tone: 'attention', message: 'Session expired — sign in again.' },
  unavailable: { tone: 'muted', message: 'Graph service unavailable — try again shortly.' },
  error: { tone: 'attention', message: "Couldn't load the graph." },
};

/** Top-level composition for the repository's Graph tab: canvas + legend + node inspector, wired
 *  to two query modes — structural browse and "find similar by meaning" via a node's own stored
 *  embedding. No free-text search here by design: every query this view can issue is either pure
 *  graph traversal or reuses a value already in the database. */
export function CodeGraphPanel({ repoId }: { repoId: number }) {
  const [mode, setMode] = useState<GraphMode>({ kind: 'browse', hops: 1 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>(undefined);
  const { data, loading, error, reload } = useCodeGraph(repoId, mode);

  const selectedNode = useMemo(
    () => data?.nodes.find((n) => n.node_id === selectedNodeId) ?? null,
    [data, selectedNodeId]
  );

  return (
    <Card
      title="Code graph"
      actions={
        <div className="flex items-center gap-2">
          {mode.kind === 'similar' ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setMode({ kind: 'browse', nodeId: selectedNodeId, hops: 1 })}>
              Back to structural view
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" onClick={reload}>
            Refresh
          </Button>
        </div>
      }>
      {/* A query error never blanks an already-rendered graph (the hook keeps the last-good
          `data` across a failed fetch) — it shows as a brief note inside the inspector box beside
          the still-visible canvas. `InlineStatus` below is only for when there's nothing to show
          yet at all: the very first load, or that first load itself failing. */}
      {!data && loading ? <InlineStatus>Loading the graph…</InlineStatus> : null}
      {!data && !loading && error ? (
        <InlineStatus>{ERROR_COPY[error.code].message}</InlineStatus>
      ) : null}
      {data && data.nodes.length === 0 ? (
        <InlineStatus>No indexed symbols yet for this repository.</InlineStatus>
      ) : null}
      {data && data.nodes.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_260px]">
          <div className="flex flex-col gap-2">
            <Legend />
            <CodeGraphCanvas
              data={data}
              selectedNodeId={selectedNodeId}
              onNodeSelect={(nodeId) => setSelectedNodeId(nodeId)}
            />
          </div>
          <div className="border-border bg-surface rounded-lg border">
            <NodeInspector
              node={selectedNode}
              // Requesting similar mode isn't the same as *showing* it: a failed "find similar"
              // keeps the previous browse-mode graph on screen, so the button shouldn't read as
              // pressed/active for a result that isn't actually visible.
              similarActive={mode.kind === 'similar' && !error}
              notice={error ? ERROR_COPY[error.code] : null}
              onExpand={() => {
                if (!selectedNodeId) return;
                setMode({ kind: 'browse', nodeId: selectedNodeId, hops: 1 });
              }}
              onFindSimilar={() => {
                if (!selectedNodeId) return;
                setMode({ kind: 'similar', nodeId: selectedNodeId });
              }}
            />
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function Legend() {
  return (
    <div className={`${META_CLASS} flex flex-wrap items-center gap-x-4 gap-y-1`}>
      {Object.values(SYMBOL_KIND_STYLE).map((s) => (
        <span key={s.label} className="flex items-center gap-1.5">
          <span
            className="inline-block size-2.5 rounded-full"
            style={{ background: s.color, opacity: 0.35, border: `1.5px solid ${s.color}` }}
          />
          {s.label}
        </span>
      ))}
      <span className="text-subtle mx-1">|</span>
      {Object.values(RELATION_STYLE).map((s) => (
        <span key={s.label} className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4" style={{ background: s.stroke }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}
