import React from 'react';

import { cn } from '../../cn';
import { Button } from '../../components/button';
import { Field } from '../../components/field';
import { SegmentedControl } from '../../components/segmented-control';
import { SelectField } from '../../components/select-field';
import { LABEL_CLASS } from '../../lib/type-roles';
import type { ApiKeysToolbarProps } from './types';

// Replaces the Api-Keys right rail — which was taller than the single-row table it parameterised.
// See `OverviewToolbar` for the reasoning.
//
// Where the other rail sections went: KEY HYGIENE → `ApiKeysHygieneNotes`, inline above the table;
// LIFECYCLE → deleted, since `TypedConfirmDialog` already carries that copy at the moment it
// matters; `New key` → the trailing action here, beside the parameters it consumes.

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
