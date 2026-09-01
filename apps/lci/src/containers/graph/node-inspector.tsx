'use client';

import { Button } from '@lightbridge/ui-web/src/components/button';
import { StatusText } from '@lightbridge/ui-web/src/components/status-text';
import { DATA_CLASS, META_CLASS } from '@lightbridge/ui-web/src/lib/type-roles';

import type { GraphSymbol } from '../../lib/server/admin';

/** A query against the selected node (e.g. "find similar") came back with a reason rather than a
 *  result — rendered as one short line right in this box, not by blanking the graph. */
export interface InspectorNotice {
  tone: 'muted' | 'attention';
  message: string;
}

/** Side panel for the currently-selected symbol: identity, the two actions that move the graph
 *  view — expand its structural neighborhood, or find symbols like it by meaning — and, if the
 *  last action didn't produce a result, one brief line saying why. */
export function NodeInspector({
  node,
  onExpand,
  onFindSimilar,
  similarActive,
  notice,
}: {
  node: GraphSymbol | null;
  onExpand: () => void;
  onFindSimilar: () => void;
  similarActive: boolean;
  notice?: InspectorNotice | null;
}) {
  if (!node) {
    return (
      <div className={`${META_CLASS} flex h-full items-center justify-center px-4 text-center`}>
        Click a node to see its details and explore from there.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3 px-4 py-3">
      <div>
        <p className={`${DATA_CLASS} break-all`}>{node.label}</p>
        <p className={`${META_CLASS} mt-1`}>
          {node.source_file}:{node.start_line}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Button size="sm" variant="secondary" onClick={onExpand}>
          Expand neighborhood
        </Button>
        <Button size="sm" variant={similarActive ? 'primary' : 'secondary'} onClick={onFindSimilar}>
          Find similar (by meaning)
        </Button>
      </div>
      {notice ? <StatusText tone={notice.tone}>{notice.message}</StatusText> : null}
    </div>
  );
}
