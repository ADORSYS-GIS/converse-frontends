import { cookies } from 'next/headers';

import { SESSION_COOKIE } from '../auth';
import type { Repository } from '../domain/repos';
import type { Review, Task } from '../domain/tasks';

/**
 * Server-side client for LCI's control-plane read API (resource server). Runs only in Server
 * Components: reads the httpOnly session cookie and forwards the OIDC access token as a Bearer
 * credential — the same token the control plane validates.
 */
function controlPlaneUrl(): string {
  return (process.env.CONTROL_PLANE_URL ?? 'http://localhost:8080/api/v2').replace(/\/+$/, '');
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: 'unauthenticated' | 'unavailable' | 'error'; status?: number };

async function authedFetch(path: string): Promise<Response | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return fetch(`${controlPlaneUrl()}${path}`, {
    headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
    cache: 'no-store',
  });
}

function classify(status: number): 'unauthenticated' | 'unavailable' | 'error' {
  if (status === 401 || status === 403) return 'unauthenticated';
  if (status === 503) return 'unavailable';
  return 'error';
}

interface TasksPageResponse {
  tasks: Task[];
  total: number;
}

/** `GET /tasks` — the most recent 100 runs, unfiltered. Feeds the Overview screen's insights. */
export async function listTasks(): Promise<ApiResult<Task[]>> {
  try {
    const res = await authedFetch('/tasks');
    if (!res) return { ok: false, reason: 'unauthenticated' };
    if (!res.ok) return { ok: false, reason: classify(res.status), status: res.status };
    const body = (await res.json()) as TasksPageResponse;
    return { ok: true, data: body.tasks };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

/** Status filter accepted by `GET /tasks` — `"all"` is sent as omitted (no filter). */
export type TasksStatusFilter = 'active' | 'pending' | 'success' | 'error' | 'muted';

export interface TasksPageParams {
  page: number;
  pageSize: number;
  status?: TasksStatusFilter;
  repositoryId?: number;
  q?: string;
}

/** `GET /tasks?page=&page_size=&status=&repository_id=&q=` — real server-side pagination +
 *  filtering for the Runs page. */
export async function listTasksPage(
  params: TasksPageParams
): Promise<ApiResult<TasksPageResponse>> {
  const query = new URLSearchParams({
    page: String(params.page),
    page_size: String(params.pageSize),
  });
  if (params.status) query.set('status', params.status);
  if (params.repositoryId !== undefined) query.set('repository_id', String(params.repositoryId));
  if (params.q) query.set('q', params.q);

  try {
    const res = await authedFetch(`/tasks?${query.toString()}`);
    if (!res) return { ok: false, reason: 'unauthenticated' };
    if (!res.ok) return { ok: false, reason: classify(res.status), status: res.status };
    return { ok: true, data: (await res.json()) as TasksPageResponse };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

/** `GET /tasks/{id}` — a single run, or `null` data on 404. */
export async function getTask(id: string): Promise<ApiResult<Task | null>> {
  try {
    const res = await authedFetch(`/tasks/${encodeURIComponent(id)}`);
    if (!res) return { ok: false, reason: 'unauthenticated' };
    if (res.status === 404) return { ok: true, data: null };
    if (!res.ok) return { ok: false, reason: classify(res.status), status: res.status };
    return { ok: true, data: (await res.json()) as Task };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

/** `GET /tasks/{id}/review` — the persisted review for a run, or `null` when none recorded. */
export async function getReview(id: string): Promise<ApiResult<Review | null>> {
  try {
    const res = await authedFetch(`/tasks/${encodeURIComponent(id)}/review`);
    if (!res) return { ok: false, reason: 'unauthenticated' };
    if (res.status === 404) return { ok: true, data: null };
    if (!res.ok) return { ok: false, reason: classify(res.status), status: res.status };
    return { ok: true, data: (await res.json()) as Review };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

export interface RepositoriesCursor {
  activity_at: string;
  id: number;
}

export interface RepositoriesPageResponse {
  repositories: Repository[];
  total: number;
  next: RepositoriesCursor | null;
  prev: RepositoriesCursor | null;
}

export interface RepositoriesPageParams {
  pageSize: number;
  q?: string;
  after?: RepositoriesCursor;
  before?: RepositoriesCursor;
}

/** `GET /repositories?page_size=&q=&after_activity_at=&after_id=` (or `before_*`) — connected
 *  repositories + run activity, most-recently-active first, one page at a time. */
export async function listRepositoriesPage(
  params: RepositoriesPageParams
): Promise<ApiResult<RepositoriesPageResponse>> {
  const query = new URLSearchParams({ page_size: String(params.pageSize) });
  if (params.q) query.set('q', params.q);
  if (params.after) {
    query.set('after_activity_at', params.after.activity_at);
    query.set('after_id', String(params.after.id));
  }
  if (params.before) {
    query.set('before_activity_at', params.before.activity_at);
    query.set('before_id', String(params.before.id));
  }

  try {
    const res = await authedFetch(`/repositories?${query.toString()}`);
    if (!res) return { ok: false, reason: 'unauthenticated' };
    if (!res.ok) return { ok: false, reason: classify(res.status), status: res.status };
    return { ok: true, data: (await res.json()) as RepositoriesPageResponse };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}
