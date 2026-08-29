import React from 'react';

import { cn } from '../../cn';
import { Button } from '../../components/button';
import { ErrorLine } from '../../components/error-line';
import { InlineStatus } from '../../components/inline-status';
import { SkeletonRow } from '../../components/skeleton-row';
import {
  DETAIL_GROUP_CLASS,
  DETAIL_LIST_CLASS,
  DETAIL_ROW_CLASS,
  DETAIL_SECTION_CLASS,
} from '../../lib/detail-row';
import { NO_QUOTA_TIER_LABEL } from '../../lib/quota-tier';
import { LABEL_CLASS, PANEL_TITLE_CLASS, ROW_CLASS, SUBJECT_CLASS } from '../../lib/type-roles';
import type { ProjectSettingsProps, ProjectSettingsRow } from './types';

/** Heading for whichever host mounts this section — see `MANAGE_SELECTION_RAIL_LABEL`'s note. */
export const PROJECT_SETTINGS_LABEL = 'Projects';

export const NO_PROJECTS_MESSAGE = 'No projects in this account yet.';

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

// Contract: docs/design/console-redesign/README.md §4 — content on the floor, no card, tonal
// separation only. Second on `/settings`, under Account, because a project hangs off an account.
//
// A stack of per-project blocks rather than a `LedgerTable`: a table is for comparing rows on a
// shared axis, which is what `/manage` is for. This screen answers "what is this project set to",
// one project at a time, and seven columns of mostly-categorical ids compared side by side would
// be a worse version of the ledger next door rather than a settings surface.
export function ProjectSettings({
  projects,
  loading = false,
  loadingRowCount = 3,
  error,
  onRetry,
  emptyMessage = NO_PROJECTS_MESSAGE,
  onRename,
  renameDisabled = false,
  renameReason,
  className,
}: ProjectSettingsProps) {
  return (
    <section aria-label={PROJECT_SETTINGS_LABEL} className={cn(DETAIL_SECTION_CLASS, className)}>
      {/* The heading stays rendered in every state — an empty or failed list is a line ABOVE
          still-rendered structure, never a placard that replaces it (console-ui skill § States).

          The `label` role, NOT `panel-title`: `AccountPanel` heads the section directly above this
          one with the same role, and two peer sections on one screen whose headings differ by a
          type step read as a hierarchy that is not there. The page's own heading is `ScreenHeading`
          above both. */}
      <h2 className={LABEL_CLASS}>{PROJECT_SETTINGS_LABEL}</h2>

      {renameReason ? <InlineStatus>{renameReason}</InlineStatus> : null}

      {error ? (
        <ErrorLine message={error} onRetry={onRetry} />
      ) : loading ? (
        <div className={DETAIL_LIST_CLASS}>
          {Array.from({ length: loadingRowCount }, (_, index) => (
            <SkeletonRow key={index} columnCount={3} />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <InlineStatus>{emptyMessage}</InlineStatus>
      ) : (
        projects.map((project) => (
          <div key={project.id} className={DETAIL_GROUP_CLASS}>
            <div className={DETAIL_ROW_CLASS}>
              <h3 className={SUBJECT_CLASS}>{project.name}</h3>
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

            <dl className={DETAIL_LIST_CLASS}>
              {detailRows(project).map(({ term, value }) => (
                <div key={term} className={DETAIL_ROW_CLASS}>
                  <dt className={LABEL_CLASS}>{term}</dt>
                  <dd className={ROW_CLASS}>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))
      )}
    </section>
  );
}
