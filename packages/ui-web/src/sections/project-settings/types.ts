import type { ReactNode } from 'react';

/**
 * One project's settings, as `packages/authz-rpc/schema/authz.cstack` actually declares them.
 *
 * Every field below is a real column on `model.Project`; nothing here is invented, and the fields
 * this shape deliberately does NOT carry are as load-bearing as the ones it does:
 *
 *  - **no spend and no budget ceiling** — spend lives in the usage backend and this screen does
 *    not query it. `Project` has no currency column of any kind, so there is nothing to render.
 *  - **no member or key counts** — `Project.members`/`Project.apiKeys` are relations the list
 *    endpoint does not return, so a count here could only ever be a fabricated zero (the same
 *    correction issue #270 already made to the Manage ledger).
 *  - **no `defaultLimits`/`allowedModels`** — both are opaque `Json`, and rendering a blob as a
 *    settings row would be noise, not information. `allowedModels` additionally only means
 *    anything under `modelPolicy = "allowlist"`.
 *
 * Exactly one of these is writable from a console: `name`, through the generic
 * `model.Project.update` verb. Every other field is `@readonly` with its own dedicated procedure
 * (`setProjectQuota`, `setProjectModelPolicy`, `disableProject`/`enableProject`,
 * `setDefaultProject`) or a catalogue-validated id with no catalogue endpoint to offer. So this
 * section renders one action and a column of facts — which is the contract, not a shortcut.
 */
export type ProjectSettingsRow = {
  /** `projects.id` — caller-minted at create time, and the only stable way to address a project. */
  id: string;
  name: string;
  /**
   * `Project.billingIdentity` — "who is paying", moved off `Account` by ADR-0006 so one account
   * can bill several projects to different parties. `@unique` across the whole table.
   */
  billingIdentity: string;
  /** `Project.billingPlan` — a plan id from the operator-configured catalogue
   *  (`procedure.listBillingPlans`), never a price. */
  billingPlan: string;
  /**
   * `Project.projectQuota` — the pooled governance **tier id** across everyone on the project,
   * drawn from the same catalogue as `Account.defaultQuota`. Never a currency amount and never a
   * numeric ceiling; `null` means no tier is assigned, which is what every project starts with.
   */
  quotaTier: string | null;
  /**
   * `Project.modelPolicy` — `allow_all` | `allowlist` | `deny_all` (ADR-0018). A plain string
   * rather than a union here for the same reason the schema keeps it a plain `String`: the Rust
   * side parses it FAIL-CLOSED, so an unrecognised value is a real state the console may receive
   * and must render as-is rather than coerce.
   */
  modelPolicy: string;
  /**
   * `Project.status` — `active` | `suspended`, written only by `disableProject`/`enableProject`.
   * Rendered as text, never a pill. A value outside that pair means client/backend drift and is
   * shown verbatim rather than resolved to either.
   */
  status: string;
  /**
   * `Project.isDefault` — set once by a `BEFORE INSERT` trigger for an account's first project.
   * Worth a row because it is the one flag with a consequence a user can hit: a default project
   * can be suspended but never hard-deleted, and it carries no membership roster at all.
   */
  isDefault: boolean;
};

export type ProjectSettingsPagination = {
  shown: number;
  total?: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev?: () => void;
  onNext?: () => void;
};

export interface ProjectSettingsProps {
  projects: ProjectSettingsRow[];
  loading?: boolean;
  /** How many skeleton blocks to render while loading — match the page size the caller pages by. */
  loadingRowCount?: number;
  /** A genuine failed fetch, distinct from "the fetch succeeded and there are no projects". */
  error?: string;
  onRetry?: () => void;
  /** Shown as an inline status line above still-rendered structure — never a centred placard. */
  emptyMessage?: ReactNode;

  /**
   * The section-scoped search box, leading the block — the unbounded N×7 dump this section used
   * to be became unreadable past a handful of projects, so search + `pagination` (10/page) are
   * what keep it a settings surface rather than a second, worse ledger. `undefined` search/
   * `onSearchChange` is not a valid state; both are required the same way `ProjectsLedger`'s are.
   */
  search: string;
  onSearchChange: (value: string) => void;
  /** A search that narrowed the list down to zero rows — distinct from `emptyMessage`, which is
   *  "this account has no projects at all". */
  filteredEmptyMessage?: ReactNode;

  /** Omitted when the source cannot page (or there is only one page) — never a caption claiming
   *  more rows exist with nothing to click. */
  pagination?: ProjectSettingsPagination;

  /** Opens `ProjectNameDialog` for this row. */
  onRename: (project: ProjectSettingsRow) => void;
  /**
   * Disables every Rename and states why — the presentation-only mirror of
   * `model.Project.update`'s `@@allow` gate (owner or project member). The real enforcement is
   * `lightbridge-authz`'s own RBAC check; this only avoids offering a control that would fail.
   */
  renameDisabled?: boolean;
  /** Stated once above the list; `undefined` exactly when renaming is possible. */
  renameReason?: string;
  className?: string;
}
