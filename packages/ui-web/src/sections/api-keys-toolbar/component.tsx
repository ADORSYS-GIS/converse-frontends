import React from 'react';

import { cn } from '../../cn';
import { Button } from '../../components/button';
import { Field } from '../../components/field';
import { SegmentedControl } from '../../components/segmented-control';
import { SelectField } from '../../components/select-field';
import { LABEL_CLASS } from '../../lib/type-roles';
import type { ApiKeysToolbarProps } from './types';

// Contract: owner review 2026-08-29 — replaces the Api-Keys screen's right rail (FILTERS, KEY
// HYGIENE, LIFECYCLE and the `New key` action) with one horizontal strip above the ledger. See
// `OverviewToolbar`'s docstring for the reasoning; this screen made the case most starkly, since
// its rail was measurably TALLER than the single-row table it parameterised.
//
// What happened to the other three rail sections:
//
//  - **KEY HYGIENE** → `ApiKeysHygieneNotes`, rendered inline above the table with the ledger's
//    own status summary. Its counts were always a restatement of the ledger's STATUS column; as
//    an inline status line they read as annotation of the table rather than a second panel
//    competing with it (console-ui skill "States": status is an inline mono line).
//  - **LIFECYCLE** → deleted. Its standing "Revoke keeps history, Delete removes it" copy is
//    already the `TypedConfirmDialog`'s description at the moment either action is taken, which
//    is the only moment it matters. Permanent help text for a modal decision is help nobody is
//    reading when they need it.
//  - **`New key`** → the trailing action here, keeping "the action that consumes the parameters"
//    beside those parameters, which is what the rail contract was really protecting.
export function ApiKeysToolbar({
  projectField,
  statusOptions,
  statusValue,
  onStatusChange,
  search,
  onSearchChange,
  onCreate,
  createLabel = '+ New key',
  createDisabledReason,
  className,
}: ApiKeysToolbarProps) {
  return (
    <section
      aria-label="Filters and actions"
      className={cn('flex flex-wrap items-center gap-x-4 gap-y-3', className)}>
      <SelectField layout="inline" className="shrink-0" {...projectField} />

      {/* Hairline between the precondition (which project) and the filters that narrow within
          it. `hidden sm:block` — once the row wraps, a vertical rule mid-wrap is just noise. */}
      <span aria-hidden="true" className="bg-border hidden h-[30px] w-px shrink-0 sm:block" />

      {/* `shrink-0` on every control, and `items-center` rather than `items-end`, because every
          label in this row is `inline`: with a mix of stacked and inline labels the row had three
          different baselines, and without `shrink-0` flex squeezed the segmented control down to
          an unreadable ~70px (owner screenshot, 2026-08-29). */}
      <div className="flex shrink-0 items-center gap-2">
        <span className={cn(LABEL_CLASS, 'shrink-0')}>Status</span>
        <SegmentedControl
          aria-label="Status filter"
          options={statusOptions}
          value={statusValue}
          onChange={onStatusChange}
        />
      </div>

      <Field
        layout="inline"
        label="Search"
        placeholder="name or prefix…"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        containerClassName="shrink-0"
        className="w-[200px]!"
      />

      <div className="ml-auto flex flex-col items-end gap-1">
        <Button
          type="button"
          variant="primary"
          disabled={!onCreate}
          title={createDisabledReason}
          onClick={onCreate}>
          {createLabel}
        </Button>
        {!onCreate && createDisabledReason ? (
          <span className={LABEL_CLASS}>{createDisabledReason}</span>
        ) : null}
      </div>
    </section>
  );
}
