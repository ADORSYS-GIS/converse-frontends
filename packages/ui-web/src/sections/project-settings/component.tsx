import React from 'react';

import { cn } from '../../cn';
import { ErrorLine } from '../../components/error-line';
import { Field } from '../../components/field';
import { InlineStatus } from '../../components/inline-status';
import { Pagination } from '../../components/pagination';
import { SettingsRow } from '../../components/settings-row';
import { SkeletonRow } from '../../components/skeleton-row';
import { DETAIL_LIST_CLASS, DETAIL_ROW_CLASS } from '../../lib/detail-row';
import { NO_QUOTA_TIER_LABEL } from '../../lib/quota-tier';
import { BODY_CLASS, LABEL_CLASS } from '../../lib/type-roles';
import type { ProjectSettingsProps, ProjectSettingsRow } from './types';

/** Heading for whichever host mounts this section — see `MANAGE_SELECTION_RAIL_LABEL`'s note. */
export const PROJECT_SETTINGS_LABEL = 'Projects';

export const NO_PROJECTS_MESSAGE = 'No projects in this account yet.';

/** The row's own one-line status/tier summary — enough to scan the list without opening any one
 *  project; the rest of its facts (`detailRows`, below) are what the sheet is for. */
function rowSummary(project: ProjectSettingsRow): string {
  return `${project.status} · ${project.quotaTier ?? NO_QUOTA_TIER_LABEL}`;
}

/**
 * The rows one project owns, in the order they answer questions: who pays, on what plan, under
 * what ceiling, against which models, and what state the thing is in. Exported for
 * `ProjectSettingsDetail` (below) — the sheet body `apps/console`'s `project-settings-centre.tsx`
 * renders inside `DetailSheet`, whose own `title`/`subtitle` already carry the project's name, the
 * same "chrome already said it" contract `sections/project-detail` follows for its own sheet.
 *
 * A module-level function rather than six inline ternaries so the ORDER is stated once and every
 * project's detail is guaranteed to read down the same column.
 */
export function detailRows(project: ProjectSettingsRow): { term: string; value: string }[] {
  return [
    { term: 'Project id', value: project.id },
    { term: 'Billing identity', value: project.billingIdentity },
    { term: 'Billing plan', value: project.billingPlan },
    { term: 'Quota tier', value: project.quotaTier ?? NO_QUOTA_TIER_LABEL },
    { term: 'Model policy', value: project.modelPolicy },
    { term: 'Status', value: project.status },
    // Not "true"/"false": the flag's meaning is what matters, and its consequence (a default
    // project can be suspended but never hard-deleted) is not readable from a boolean.
    { term: 'Default project', value: project.isDefault ? 'Yes' : 'No' },
  ];
}

/** The `DetailSheet` body for one project's full field list — `ProjectSettings`' rows open the
 *  sheet; this is what fills it. Kept as its own export (rather than inlined at the container)
 *  because the field order/labels are this section's contract, not the app's to restate. */
export function ProjectSettingsDetail({
  project,
  className,
}: {
  project: ProjectSettingsRow;
  className?: string;
}) {
  return (
    <dl className={cn(DETAIL_LIST_CLASS, className)}>
      {detailRows(project).map(({ term, value }) => (
        <div key={term} className={DETAIL_ROW_CLASS}>
          <dt className={LABEL_CLASS}>{term}</dt>
          <dd className={BODY_CLASS}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

// Contract: phase 9 (Addition C, owner: "The settings pages do NOT look like a settings page. Why
// not do the classical list-like setting page?") — a search field leading the card, then a
// classical settings LIST (`settings-list`/`SettingsRow`): one clickable row per project, name
// plus a status/tier summary, opening `DetailSheet` with the project's full field list — the same
// row-opens-a-sheet contract `ProjectsLedger`'s table already uses, at settings density instead of
// a ledger's. `Rename` moved off the row and into the sheet's own footer (`apps/console`'s
// `project-settings-centre.tsx`), since it now targets whichever project the sheet has open rather
// than needing its own button on every row.
//
// Supersedes the "one sub-card per project, full field grid inline" shape this section used to
// render: an account with more than a handful of projects turned that into a long scroll of
// definition grids, which is exactly what a settings LIST (scan the summary, open what you need)
// replaces.
export function ProjectSettings({
  projects,
  loading = false,
  loadingRowCount = 3,
  error,
  onRetry,
  emptyMessage = NO_PROJECTS_MESSAGE,
  search,
  onSearchChange,
  filteredEmptyMessage,
  pagination,
  onSelectRow,
  selectedProjectId,
  className,
}: ProjectSettingsProps) {
  const isEmpty = !loading && !error && projects.length === 0;

  return (
    <section aria-label={PROJECT_SETTINGS_LABEL} className={cn('flex flex-col gap-4', className)}>
      {/* The heading stays rendered in every state — an empty or failed list is a line ABOVE
          still-rendered structure, never a placard that replaces it (console-ui skill § States). */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className={LABEL_CLASS}>{PROJECT_SETTINGS_LABEL}</h2>
        <Field
          label="Search"
          layout="inline"
          hideLabel
          placeholder="Find a project…"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      {error ? (
        <ErrorLine message={error} onRetry={onRetry} />
      ) : loading ? (
        <div className="settings-list">
          {Array.from({ length: loadingRowCount }, (_, index) => (
            <SkeletonRow key={index} columnCount={2} />
          ))}
        </div>
      ) : isEmpty ? (
        <InlineStatus>{search ? (filteredEmptyMessage ?? emptyMessage) : emptyMessage}</InlineStatus>
      ) : (
        <>
          <div className="settings-list">
            {projects.map((project) => (
              <SettingsRow
                key={project.id}
                label={project.name}
                description={rowSummary(project)}
                current={project.id === selectedProjectId}
                onClick={() => onSelectRow(project)}
              />
            ))}
          </div>

          {pagination ? (
            <Pagination
              shown={pagination.shown}
              total={pagination.total}
              unit="projects"
              hasPrev={pagination.hasPrev}
              hasNext={pagination.hasNext}
              onPrev={pagination.onPrev}
              onNext={pagination.onNext}
            />
          ) : null}
        </>
      )}
    </section>
  );
}
