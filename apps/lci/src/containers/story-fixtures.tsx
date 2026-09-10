/**
 * Fixtures and decorators shared by every `apps/lci` Storybook story.
 *
 * Storybook-only — nothing here is imported by the app. The screens themselves are already
 * presentational (props in, JSX out; every one takes an `ApiResult<T>` rather than fetching), so a
 * story needs no mock data layer, only data. That shape is deliberate — see
 * `docs/knowledge/architecture-conventions.md` on why containers do not fetch or route.
 *
 * The two decorators cover the only two contexts these screens read that Storybook has no
 * equivalent for: nuqs's URL state and Next's pathname. Everything else that would need a running
 * Next server (`next/link`, `next/navigation`, the Server Actions, `lib/server/session`) is
 * aliased at the bundler in `packages/ui-web/.storybook/main.ts`.
 */
import type { Decorator } from '@storybook/react-vite';
import { NuqsAdapter } from 'nuqs/adapters/react';

import type { SessionClaims } from '../lib/auth';
import type { Repository } from '../lib/domain/repos';
import type { Review, ReviewFinding, Task } from '../lib/domain/tasks';
import type { GraphResponse } from '../lib/server/admin';
import type { ResolvedSettings } from '../lib/server/admin';

/** Frozen "now" so relative timestamps ("3 minutes ago") never drift between two screenshots. */
export const NOW = Date.parse('2026-09-03T12:00:00.000Z');

/** `n` hours before `NOW`, as the ISO string the control plane returns. */
function hoursAgo(n: number): string {
  return new Date(NOW - n * 3_600_000).toISOString();
}

export function repository(overrides: Partial<Repository> = {}): Repository {
  return {
    id: 1,
    platform_repo_id: 5_000_001,
    platform: 'github',
    owner: 'adorsys-gis',
    name: 'lightbridge-authz',
    default_branch: 'main',
    status: 'approved',
    active: true,
    approved_at: hoursAgo(720),
    approved_by: 'ada@adorsys.com',
    task_count: 42,
    last_task_at: hoursAgo(3),
    ...overrides,
  };
}

export const REPOSITORIES: Repository[] = [
  repository(),
  repository({
    id: 2,
    platform_repo_id: 5_000_002,
    name: 'converse-frontends',
    task_count: 128,
    last_task_at: hoursAgo(1),
  }),
  repository({
    id: 3,
    platform_repo_id: 5_000_003,
    name: 'lightbridge-code-intelligence',
    status: 'pending',
    approved_at: null,
    approved_by: null,
    task_count: 0,
    last_task_at: null,
  }),
  repository({
    id: 4,
    platform: 'gitlab',
    platform_repo_id: 91_204,
    owner: 'adorsys',
    name: 'ai-helm-values',
    default_branch: 'master',
    status: 'disabled',
    task_count: 6,
    last_task_at: hoursAgo(400),
  }),
];

export function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'tsk_01j8k2m4pqr7',
    repository_id: 1,
    installation_id: 77,
    webhook_delivery_id: 'whd_01j8k2m4pqr7',
    target_type: 'pull_request',
    target_id: 412,
    command_text: 'review',
    base_sha: '2f9c1a4e8b0d3f6a9c2e5b8d1f4a7c0e3b6d9f22',
    head_sha: '7b3d91c4e5a08f2b6d0c3a9e14f78b2d5c6e0a11',
    status: 'succeeded',
    priority: 0,
    created_at: hoursAgo(3),
    started_at: hoursAgo(3),
    completed_at: new Date(NOW - 3 * 3_600_000 + 96_000).toISOString(),
    repo_owner: 'adorsys-gis',
    repo_name: 'lightbridge-authz',
    repo_default_branch: 'main',
    repo_platform: 'github',
    job_name: 'lci-task-01j8k2m4pqr7',
    error_detail: null,
    ...overrides,
  };
}

/**
 * Twelve runs spread over the last five days across three repositories, with every status the
 * screens branch on represented — a story that only carries green rows proves nothing about the
 * `attention` tone or the "no duration yet" fallback.
 */
export const TASKS: Task[] = [
  task(),
  task({
    id: 'tsk_02b7n9q1wxy4',
    target_id: 415,
    status: 'running',
    created_at: hoursAgo(1),
    started_at: hoursAgo(1),
    completed_at: null,
    job_name: 'lci-task-02b7n9q1wxy4',
  }),
  task({
    id: 'tsk_03c8p0r2yza5',
    repository_id: 2,
    repo_name: 'converse-frontends',
    target_id: 501,
    status: 'failed',
    created_at: hoursAgo(5),
    started_at: hoursAgo(5),
    completed_at: new Date(NOW - 5 * 3_600_000 + 41_000).toISOString(),
    error_detail: 'The review job exceeded its token budget.',
  }),
  task({
    id: 'tsk_04d9q1s3abz6',
    repository_id: 2,
    repo_name: 'converse-frontends',
    target_id: 503,
    status: 'queued',
    created_at: hoursAgo(0.4),
    started_at: null,
    completed_at: null,
  }),
  task({
    id: 'tsk_05e0r2t4bca7',
    repository_id: 4,
    repo_owner: 'adorsys',
    repo_name: 'ai-helm-values',
    repo_platform: 'gitlab',
    repo_default_branch: 'master',
    target_id: 15,
    status: 'succeeded',
    created_at: hoursAgo(26),
    started_at: hoursAgo(26),
    completed_at: new Date(NOW - 26 * 3_600_000 + 132_000).toISOString(),
  }),
  task({
    id: 'tsk_06f1s3u5cdb8',
    target_type: 'repository',
    target_id: 1,
    command_text: 'index',
    status: 'succeeded',
    created_at: hoursAgo(30),
    started_at: hoursAgo(30),
    completed_at: new Date(NOW - 30 * 3_600_000 + 610_000).toISOString(),
  }),
  task({
    id: 'tsk_07g2t4v6dec9',
    repository_id: 2,
    repo_name: 'converse-frontends',
    target_id: 498,
    status: 'cancelled',
    created_at: hoursAgo(48),
    started_at: hoursAgo(48),
    completed_at: new Date(NOW - 48 * 3_600_000 + 9_000).toISOString(),
  }),
  task({
    id: 'tsk_08h3u5w7efd0',
    target_id: 408,
    status: 'timed_out',
    created_at: hoursAgo(52),
    started_at: hoursAgo(52),
    completed_at: new Date(NOW - 52 * 3_600_000 + 1_800_000).toISOString(),
  }),
  task({
    id: 'tsk_09i4v6x8fge1',
    target_id: 400,
    status: 'succeeded',
    created_at: hoursAgo(74),
    started_at: hoursAgo(74),
    completed_at: new Date(NOW - 74 * 3_600_000 + 88_000).toISOString(),
  }),
  task({
    id: 'tsk_10j5w7y9ghf2',
    repository_id: 2,
    repo_name: 'converse-frontends',
    target_id: 490,
    status: 'succeeded',
    created_at: hoursAgo(80),
    started_at: hoursAgo(80),
    completed_at: new Date(NOW - 80 * 3_600_000 + 74_000).toISOString(),
  }),
  task({
    id: 'tsk_11k6x8z0hig3',
    repository_id: 4,
    repo_owner: 'adorsys',
    repo_name: 'ai-helm-values',
    repo_platform: 'gitlab',
    target_id: 12,
    status: 'failed',
    created_at: hoursAgo(96),
    started_at: hoursAgo(96),
    completed_at: new Date(NOW - 96 * 3_600_000 + 52_000).toISOString(),
  }),
  task({
    id: 'tsk_12l7y9a1ijh4',
    target_id: 388,
    status: 'succeeded',
    created_at: hoursAgo(110),
    started_at: hoursAgo(110),
    completed_at: new Date(NOW - 110 * 3_600_000 + 121_000).toISOString(),
  }),
];

const FINDINGS: ReviewFinding[] = [
  {
    file: 'crates/lightbridge-authz-core/src/authz.rs',
    line: 291,
    priority: 'P0',
    category: 'security',
    title: 'Wildcard grant expansion admits an unscoped permission',
    body: 'expand_grant() treats a bare "*" as matching every resource id, so a grant intended for one account authorises the whole estate.',
    suggestion:
      'if segment == "*" && depth == 0 {\n    return Err(GrantError::UnscopedWildcard);\n}',
    resources: ['https://adorsys-gis.github.io/ai-governance/'],
  },
  {
    file: 'apps/console/src/server/reports/panel-svg.ts',
    line: 113,
    priority: 'P1',
    category: 'correctness',
    title: 'Renderer cache is never reset between report builds',
    body: 'resetChartRendererCache() is defined but never called, so a second report in the same process reuses the first one’s fonts.',
    suggestion: null,
  },
  {
    file: 'packages/ui-web/src/lib/rail-grid.ts',
    line: 56,
    category: 'quality',
    severity: 'info',
    title: 'RAIL_ACTIVE_BAR_WIDTH has no consumer',
    body: '',
  },
];

export const REVIEW: Review = {
  task_id: 'tsk_01j8k2m4pqr7',
  summary:
    'Three findings: one security issue in grant expansion that should block the merge, one correctness issue in the report renderer, and one unused constant.',
  body: '',
  inline_count: 2,
  deferred_count: 1,
  out_of_scope_count: 1,
  findings: FINDINGS,
  review_url: 'https://github.com/ADORSYS-GIS/lightbridge-authz/pull/412#pullrequestreview-1',
  created_at: hoursAgo(3),
};

export const RESOLVED_SETTINGS: ResolvedSettings = {
  check_run_reporting: { value: true, source: 'default' },
  review_on_pr_open: { value: true, source: 'file' },
  review_on_push: { value: false, source: 'db' },
  push_strategy: { value: 'debounce', source: 'db' },
  push_debounce: { value: { secs: 90, nanos: 0 }, source: 'db' },
  dedup_scope: { value: 'pr', source: 'default' },
};

export const CLAIMS: SessionClaims = {
  sub: 'usr_01j8k2m4pqr7',
  email: 'ada@adorsys.com',
  preferred_username: 'ada',
  name: 'Ada Lovelace',
  exp: Math.floor(NOW / 1000) + 3600,
};

export const PERMISSIONS = ['repo:read', 'repo:approve', 'repo:configure', 'graph:read'];

/** A small structural neighbourhood: one module, its two types, and the functions over them. */
export const GRAPH: GraphResponse = {
  commit: '7b3d91c4e5a08f2b6d0c3a9e14f78b2d5c6e0a11',
  nodes: [
    {
      node_id: 'n1',
      label: 'lightbridge_authz_core::authz',
      source_file: 'crates/lightbridge-authz-core/src/authz.rs',
      start_line: 1,
    },
    {
      node_id: 'n2',
      label: 'authz::Grant',
      source_file: 'crates/lightbridge-authz-core/src/authz.rs',
      start_line: 44,
    },
    {
      node_id: 'n3',
      label: 'authz::GrantError',
      source_file: 'crates/lightbridge-authz-core/src/authz.rs',
      start_line: 88,
    },
    {
      node_id: 'n4',
      label: 'authz::expand_grant',
      source_file: 'crates/lightbridge-authz-core/src/authz.rs',
      start_line: 291,
    },
    {
      node_id: 'n5',
      label: 'authz::check_permission',
      source_file: 'crates/lightbridge-authz-core/src/authz.rs',
      start_line: 342,
    },
  ],
  edges: [
    { source: 'n1', target: 'n2', relation: 'contains' },
    { source: 'n1', target: 'n3', relation: 'contains' },
    { source: 'n1', target: 'n4', relation: 'contains' },
    { source: 'n1', target: 'n5', relation: 'contains' },
    { source: 'n4', target: 'n2', relation: 'references' },
    { source: 'n4', target: 'n3', relation: 'references' },
    { source: 'n5', target: 'n4', relation: 'calls' },
  ],
};

/**
 * nuqs's plain-React adapter. The screens that read URL state (`RepositoriesCentre`,
 * `RunsCentre`) hard-fail without an adapter mounted — this is the same wiring their vitest
 * suites do with `withNuqsTestingAdapter`, using the browser adapter so the controls really do
 * write to the preview iframe's own URL.
 */
export const withNuqs: Decorator = (Story) => (
  <NuqsAdapter>
    <Story />
  </NuqsAdapter>
);

/**
 * Pins `usePathname()` for a story, so tab strips and nav rails light the right row.
 *
 * Via a global rather than an import, deliberately: the substitute for `next/navigation` is a
 * BUNDLER alias (`packages/ui-web/.storybook/main.ts`), so importing a setter from it would not
 * typecheck against the real `next/navigation`'s declarations here.
 */
export function withPathname(pathname: string): Decorator {
  return (Story) => {
    (globalThis as { __LCI_STORYBOOK_PATHNAME__?: string }).__LCI_STORYBOOK_PATHNAME__ = pathname;
    return <Story />;
  };
}

/** Page stories render the real screen padding the `(lci)` route group gives them. */
export const withPagePadding: Decorator = (Story) => (
  <div className="mx-auto w-full max-w-6xl px-6 py-8">
    <Story />
  </div>
);
