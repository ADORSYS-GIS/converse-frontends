import React from 'react';

import { ErrorLine } from '../../components/error-line';
import { InlineStatus } from '../../components/inline-status';
import { Meter } from '../../components/meter';
import { INLINE_ROW_CLASS } from '../../lib/inline-row';
import { formatUsd, formatUsdOf } from '../../lib/money';
import { DATA_CLASS, META_CLASS, SECTION_TITLE_CLASS } from '../../lib/type-roles';
import type { BudgetPressureProps } from './types';

// Contract: the admin overview's budget zone — which projects are drawing hardest on the account
// ceiling, ranked. Renders uncontained on the floor; panelling is the consumer's decision
// (console-ui skill "Component conventions").
//
// NO UPSTREAM: daisy has no ranked meter list, and its `progress` is rejected outright
// (PRIMITIVES.md § "not adopted" — rounded and animated). The bar semantics already come from Base
// UI, through `Meter`; the status line and the retry line already come from `InlineStatus` and
// `ErrorLine`; the two type treatments and the row geometry are imported from `lib/`. What is left
// local is the stack gap and the two margins, and nothing else.
//
// **What this section deliberately does NOT claim.** There is no per-project budget ceiling
// anywhere in the authz schema: `Project.projectQuota` is a governance tier id from an
// operator-configured catalogue (never currency — see `ProjectsLedger`'s own divergence
// note), and `getBudgetBalance` is keyed by `budgetAccountId`, which "is always identical to
// account_id". Every meter here is therefore a project's draw on the ONE account ceiling, and
// `note` is where the caller says that in DOM text — never an SVG `<text>`, which does not wrap
// and spilled off both ends of the plot the last time a message was drawn that way.
const STACK_CLASS = 'mt-4 flex flex-col gap-4';
// The shared inline-row geometry, pushed apart: the amount is a numeral and numerals are
// right-aligned (console-ui skill "Type").
const ROW_HEAD_CLASS = `${INLINE_ROW_CLASS} justify-between`;
const NAME_CLASS = SECTION_TITLE_CLASS;

export function BudgetPressure({
  label = 'Budget pressure — draw on the account ceiling',
  projects,
  ceiling,
  threshold,
  status = 'ready',
  errorMessage,
  onRetry,
  emptyMessage,
  note,
  loadingRowCount = 3,
  className,
}: BudgetPressureProps) {
  // Sorted here rather than by the caller: the rank IS the section's message, so it cannot be
  // left to whichever order the usage response happened to mention the projects in.
  const ranked = [...projects].sort((a, b) => b.spend - a.spend);
  const measurable = ceiling !== null && ceiling > 0;

  return (
    <div className={className}>
      <div className={SECTION_TITLE_CLASS}>{label}</div>

      <div className={STACK_CLASS}>
        {status === 'error' ? (
          <ErrorLine
            message={errorMessage ?? 'Failed to load budget pressure.'}
            onRetry={onRetry}
          />
        ) : status === 'loading' ? (
          // Skeleton over the exact final geometry (console-ui skill "States"): a name line and
          // the 4px meter track, per row. daisy `skeleton` supplies the fill and the 2px radius;
          // its shimmer is suppressed centrally in theme.css.
          Array.from({ length: loadingRowCount }, (_, row) => (
            <div key={row} role="presentation" aria-hidden="true">
              <div className="skeleton h-3 w-40" />
              <div className="skeleton mt-2 h-1 w-full" />
            </div>
          ))
        ) : ranked.length === 0 ? (
          // An inline status line over still-rendered structure — never a centered placard.
          <InlineStatus>
            {emptyMessage ?? 'No project drew on the ceiling this period.'}
          </InlineStatus>
        ) : (
          ranked.map((project) => (
            <div key={project.key}>
              <div className={ROW_HEAD_CLASS}>
                <span className={NAME_CLASS}>{project.name}</span>
                <span className={DATA_CLASS}>
                  {measurable ? formatUsdOf(project.spend, ceiling) : formatUsd(project.spend)}
                </span>
              </div>
              {/* No meter at all without a real ceiling — see `BudgetPressureProps.ceiling`. */}
              {measurable ? (
                <Meter
                  className="mt-2"
                  value={project.spend}
                  ceiling={ceiling}
                  threshold={threshold}
                  showCaption={false}
                  label={`${project.name} draw on the account ceiling`}
                />
              ) : null}
            </div>
          ))
        )}
      </div>

      {note ? <p className={`${META_CLASS} mt-3`}>{note}</p> : null}
    </div>
  );
}
