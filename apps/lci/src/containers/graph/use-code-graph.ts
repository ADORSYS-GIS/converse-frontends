'use client';

import { useCallback, useEffect, useState } from 'react';

import type { GraphResponse } from '../../lib/server/admin';

export type GraphMode =
  { kind: 'browse'; nodeId?: string; hops: number } | { kind: 'similar'; nodeId: string };

/** `GraphApiResult`'s `reason` (`lib/server/admin.ts`) plus a catch-all for a fetch that never
 *  reached a JSON body at all (network error, non-JSON response). */
export type GraphErrorCode =
  'unauthenticated' | 'unavailable' | 'not_found' | 'no_embedding' | 'error';

export interface GraphError {
  code: GraphErrorCode;
  detail?: string;
}

interface State {
  data: GraphResponse | null;
  loading: boolean;
  error: GraphError | null;
}

const GRAPH_ERROR_CODES: readonly GraphErrorCode[] = [
  'unauthenticated',
  'unavailable',
  'not_found',
  'no_embedding',
  'error',
];

function isGraphErrorCode(value: unknown): value is GraphErrorCode {
  return typeof value === 'string' && (GRAPH_ERROR_CODES as readonly string[]).includes(value);
}

/** Drives the code-graph canvas: fetches either a structural neighborhood/overview ("browse") or a
 *  "find similar" result set ("similar") from the same-origin API proxy routes, and re-fetches
 *  whenever `mode` changes (clicking a node, expanding hops, choosing "find similar"). */
export function useCodeGraph(repoId: number, mode: GraphMode) {
  const [state, setState] = useState<State>({ data: null, loading: true, error: null });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const url =
        mode.kind === 'similar'
          ? `/api/repositories/${repoId}/symbols/${encodeURIComponent(mode.nodeId)}/similar`
          : (() => {
              const qs = new URLSearchParams();
              if (mode.nodeId) qs.set('node', mode.nodeId);
              qs.set('hops', String(mode.hops));
              return `/api/repositories/${repoId}/graph?${qs.toString()}`;
            })();
      const res = await fetch(url);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          code?: string;
          detail?: string;
          error?: string;
        } | null;
        const code: GraphErrorCode = isGraphErrorCode(body?.code) ? body.code : 'error';
        // Keep the last successfully-rendered graph on screen (`s.data`) rather than blanking the
        // canvas — a failed "find similar" (e.g. this node has no stored embedding) is an answer
        // about *that query*, not a reason to throw away what was already showing.
        setState((s) => ({
          data: s.data,
          loading: false,
          error: { code, detail: body?.detail ?? body?.error },
        }));
        return;
      }
      const data = (await res.json()) as GraphResponse;
      setState({ data, loading: false, error: null });
    } catch {
      setState((s) => ({ data: s.data, loading: false, error: { code: 'unavailable' } }));
    }
  }, [repoId, mode]);

  useEffect(() => {
    // Fetch-on-mount/mode-change: this effect synchronizes the canvas with an external system
    // (the control plane over HTTP) — `load`'s own leading `setState({ loading: true })` is the
    // deliberate start of a stale-while-revalidate transition (the previous graph, if any, stays
    // on screen via `s.data` — see `load`'s catch/error branches), not an accidental cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  return { ...state, reload: load };
}
