import { cookies } from 'next/headers';
import { cache } from 'react';

import { SESSION_COOKIE, type SessionClaims } from '../auth';
import type { Repository } from '../domain/repos';
import type { ApiResult } from './api';

/**
 * Server-only client for the control plane's **admin** API — the approval gate and per-repo
 * settings/graph endpoints. The repo settings screen covers the six review-behaviour settings
 * only; model-override and review-preset selection are not implemented here.
 */
function controlPlaneUrl(): string {
  return (process.env.CONTROL_PLANE_URL ?? 'http://localhost:8080/api/v2').replace(/\/+$/, '');
}

export function permissionsClaim(): string {
  return process.env.PERMISSIONS_CLAIM?.trim() || 'permissions';
}

/** The caller's permissions, read from the configured (possibly nested) claim path. */
export function permissions(claims: SessionClaims | null): string[] {
  if (!claims) return [];
  let node: unknown = claims;
  for (const segment of permissionsClaim().split('.')) {
    if (node && typeof node === 'object' && segment in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[segment];
    } else {
      return [];
    }
  }
  return Array.isArray(node) ? node.filter((p): p is string => typeof p === 'string') : [];
}

export function hasPermission(claims: SessionClaims | null, permission: string): boolean {
  return permissions(claims).includes(permission);
}

function classify(status: number): 'unauthenticated' | 'unavailable' | 'error' {
  if (status === 401 || status === 403) return 'unauthenticated';
  if (status === 503) return 'unavailable';
  return 'error';
}

async function token(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

/** `GET /admin/repositories[?status=]` — every repository (pending/approved/disabled) when
 *  `status` is omitted, so approvals stay reversible from the UI. */
export async function listAdminRepos(status?: string): Promise<ApiResult<Repository[]>> {
  try {
    const t = await token();
    if (!t) return { ok: false, reason: 'unauthenticated' };
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    const res = await fetch(`${controlPlaneUrl()}/admin/repositories${qs}`, {
      headers: { authorization: `Bearer ${t}`, accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, reason: classify(res.status), status: res.status };
    return { ok: true, data: (await res.json()) as Repository[] };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

/** One repository by id — narrows the list call (no single-repo admin GET endpoint exists).
 *  `cache`d per request: a repo's own segment resolves it more than once (chrome + view). */
export const getAdminRepo = cache(async (id: number): Promise<ApiResult<Repository | null>> => {
  const result = await listAdminRepos();
  if (!result.ok) return result;
  return { ok: true, data: result.data.find((repo) => repo.id === id) ?? null };
});

/** `POST /admin/repositories/{id}/{approve|deny}`. */
export async function setRepoStatus(id: number, action: 'approve' | 'deny'): Promise<boolean> {
  const t = await token();
  if (!t) return false;
  try {
    const res = await fetch(`${controlPlaneUrl()}/admin/repositories/${id}/${action}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${t}`, accept: 'application/json' },
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Shared approve/deny mutation: permission-checks the caller, validates `id`, then mutates. */
export async function mutateRepoApproval(
  claims: SessionClaims | null,
  id: number,
  action: 'approve' | 'deny'
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasPermission(claims, `repo:${action}`)) {
    return { ok: false, error: `Unauthorized: repo:${action} permission required` };
  }
  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, error: 'Invalid repository id' };
  }
  if (!(await setRepoStatus(id, action))) {
    return { ok: false, error: `Failed to ${action} repository` };
  }
  return { ok: true };
}

/** A value resolved across ADR-0111's three-layer chain: built-in default → repo config file →
 *  admin DB override (wins). Mirrors control-plane's `Sourced<T>`. */
export interface Sourced<T> {
  value: T;
  source: 'default' | 'file' | 'db';
}

export interface ResolvedSettings {
  check_run_reporting: Sourced<boolean>;
  review_on_pr_open: Sourced<boolean>;
  review_on_push: Sourced<boolean>;
  push_strategy: Sourced<'supersede' | 'debounce' | 'every'>;
  push_debounce: Sourced<{ secs: number; nanos: number }>;
  dedup_scope: Sourced<'pr' | 'commit'>;
}

/** `GET /admin/repositories/{id}/settings` — the repo's effective per-repo review settings, with
 *  provenance. Needs `repo:read`. */
export async function getRepoSettings(
  id: number
): Promise<ApiResult<{ repository_id: number; settings: ResolvedSettings }>> {
  try {
    const t = await token();
    if (!t) return { ok: false, reason: 'unauthenticated' };
    const res = await fetch(`${controlPlaneUrl()}/admin/repositories/${id}/settings`, {
      headers: { authorization: `Bearer ${t}`, accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, reason: classify(res.status), status: res.status };
    return {
      ok: true,
      data: (await res.json()) as { repository_id: number; settings: ResolvedSettings },
    };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

/** Mirrors control-plane's `SetSettingsBody`: omitted leaves the value alone, `null` clears the DB
 *  override, a value sets it. */
export interface RepoSettingsPatch {
  check_run_reporting?: boolean | null;
  review_on_pr_open?: boolean | null;
  review_on_push?: boolean | null;
  push_strategy?: 'supersede' | 'debounce' | 'every' | null;
  push_debounce_seconds?: number | null;
  dedup_scope?: 'pr' | 'commit' | null;
}

/** `POST /admin/repositories/{id}/settings/override` — needs `repo:configure`. Returns whether it
 *  succeeded; the caller re-fetches to reflect the change. */
export async function setRepoSettingsOverride(
  id: number,
  patch: RepoSettingsPatch
): Promise<boolean> {
  const t = await token();
  if (!t) return false;
  try {
    const res = await fetch(`${controlPlaneUrl()}/admin/repositories/${id}/settings/override`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${t}`,
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify(patch),
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export interface GraphSymbol {
  node_id: string;
  label: string;
  source_file: string;
  start_line: number;
}

export interface GraphRel {
  source: string;
  target: string;
  relation: string;
}

export interface GraphResponse {
  commit: string;
  nodes: GraphSymbol[];
  edges: GraphRel[];
}

export type GraphApiResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      reason: 'unauthenticated' | 'unavailable' | 'error' | 'not_found' | 'no_embedding';
      status?: number;
      detail?: string;
    };

async function parseGraphNotFound(
  res: Response
): Promise<Extract<GraphApiResult<never>, { ok: false }>> {
  const body = (await res.json().catch(() => null)) as { reason?: string; message?: string } | null;
  const reason = body?.reason === 'no_embedding' ? 'no_embedding' : 'not_found';
  return { ok: false, reason, status: 404, detail: body?.message };
}

/** `GET /admin/repositories/{id}/graph[?node=&hops=&limit=]` — structural neighborhood browse.
 *  `node` omitted returns an unseeded overview slice. Needs `repo:read`. */
export async function getRepoGraph(
  id: number,
  opts?: { node?: string; hops?: number; limit?: number }
): Promise<GraphApiResult<GraphResponse>> {
  try {
    const t = await token();
    if (!t) return { ok: false, reason: 'unauthenticated' };
    const qs = new URLSearchParams();
    if (opts?.node) qs.set('node', opts.node);
    if (opts?.hops) qs.set('hops', String(opts.hops));
    if (opts?.limit) qs.set('limit', String(opts.limit));
    const suffix = qs.size > 0 ? `?${qs.toString()}` : '';
    const res = await fetch(`${controlPlaneUrl()}/admin/repositories/${id}/graph${suffix}`, {
      headers: { authorization: `Bearer ${t}`, accept: 'application/json' },
      cache: 'no-store',
    });
    if (res.status === 404) return parseGraphNotFound(res);
    if (!res.ok) return { ok: false, reason: classify(res.status), status: res.status };
    return { ok: true, data: (await res.json()) as GraphResponse };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

/** `GET /admin/repositories/{id}/symbols/{nodeId}/similar[?limit=]` — symbols found by meaning,
 *  using `nodeId`'s own already-stored embedding as the query vector. `404` with
 *  `reason: 'no_embedding'` when the symbol has no stored embedding (coverage is not 100%), or
 *  `'not_found'` when the repository itself doesn't exist. Needs `repo:read`. */
export async function getSimilarSymbols(
  id: number,
  nodeId: string,
  opts?: { limit?: number }
): Promise<GraphApiResult<GraphResponse>> {
  try {
    const t = await token();
    if (!t) return { ok: false, reason: 'unauthenticated' };
    const qs = opts?.limit ? `?limit=${opts.limit}` : '';
    const res = await fetch(
      `${controlPlaneUrl()}/admin/repositories/${id}/symbols/${encodeURIComponent(nodeId)}/similar${qs}`,
      {
        headers: { authorization: `Bearer ${t}`, accept: 'application/json' },
        cache: 'no-store',
      }
    );
    if (res.status === 404) return parseGraphNotFound(res);
    if (!res.ok) return { ok: false, reason: classify(res.status), status: res.status };
    return { ok: true, data: (await res.json()) as GraphResponse };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}
