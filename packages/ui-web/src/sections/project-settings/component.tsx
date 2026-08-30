import React from 'react';

import { cn } from '../../cn';
import { Button } from '../../components/button';
import { ErrorLine } from '../../components/error-line';
import { Field } from '../../components/field';
import { InlineStatus } from '../../components/inline-status';
import { Pagination } from '../../components/pagination';
import { SkeletonRow } from '../../components/skeleton-row';
import { DETAIL_GROUP_CLASS, DETAIL_LIST_CLASS, DETAIL_ROW_CLASS } from '../../lib/detail-row';
import { NO_QUOTA_TIER_LABEL } from '../../lib/quota-tier';
import { BODY_CLASS, LABEL_CLASS, SECTION_TITLE_CLASS } from '../../lib/type-roles';
import type { ProjectSettingsProps, ProjectSettingsRow } from './types';

/** Heading for whichever host mounts this section — see `MANAGE_SELECTION_RAIL_LABEL`'s note. */
export const PROJECT_SETTINGS_LABEL = 'Projects';

export const NO_PROJECTS_MESSAGE = 'No projects in this account yet.';

const GRID_CLASS = 'grid grid-cols-1 gap-5 md:grid-cols-2';
const ROW_CLASS = 'flex flex-col gap-1';

/**
 * The rows one project owns, in the order they answer questions: who pays, on what plan, under
 * what ceiling, against which models, and what state the thing is in.
 *
 * A module-level function rather than six inline ternaries so the ORDER is stated once and every
 * project block is guaranteed to be readable down the same column.
 */
function detailRows(project: ProjectSettingsRow): { term: string; value: string }[] {
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

// Contract: console visual revamp (2026-08, admin/settings phase) — one sub-block per project
// (name + Rename, then a 2-column definition grid at `md`), fronted by a search field + a real
// `Pagination` (10/page). The unbounded N×7 dump this section used to be — every project's full
// fact column, one after another, with nothing to page through — died the moment an account holds
// more than a handful of projects; search + pagination are what keep this a settings surface
// rather than a second, worse ledger.
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
  onRename,
  renameDisabled = false,
  renameReason,
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
          placeholder="Find a project…"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      {renameReason ? <InlineStatus>{renameReason}</InlineStatus> : null}

      {error ? (
        <ErrorLine message={error} onRetry={onRetry} />
      ) : loading ? (
        <div className={DETAIL_LIST_CLASS}>
          {Array.from({ length: loadingRowCount }, (_, index) => (
            <SkeletonRow key={index} columnCount={3} />
          ))}
        </div>
      ) : isEmpty ? (
        <InlineStatus>{search ? (filteredEmptyMessage ?? emptyMessage) : emptyMessage}</InlineStatus>
      ) : (
        <>
          {projects.map((project) => (
            <div key={project.id} className={DETAIL_GROUP_CLASS}>
              <div className={DETAIL_ROW_CLASS}>
                <h3 className={SECTION_TITLE_CLASS}>{project.name}</h3>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={renameDisabled}
                  aria-label={`Rename ${project.name}`}
                  onClick={() => onRename(project)}>
                  Rename
                </Button>
              </div>

              <dl className={GRID_CLASS}>
                {detailRows(project).map(({ term, value }) => (
                  <div key={term} className={ROW_CLASS}>
                    <dt className={LABEL_CLASS}>{term}</dt>
                    <dd className={BODY_CLASS}>{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}

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
