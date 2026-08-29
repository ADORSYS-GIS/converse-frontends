import React from 'react';

import { cn } from '../../cn';
import { Button } from '../../components/button';
import { Field } from '../../components/field';
import { SegmentedControl } from '../../components/segmented-control';
import { SelectField } from '../../components/select-field';
import { LABEL_CLASS } from '../../lib/type-roles';
import type { ApiKeysControlsProps } from './types';

// The Api-Keys screen's parameters and its create action, stacked in the LEFT rail beneath the
// nav (owner, 2026-08-29) — see `OverviewControls` for why the rail, not the content column.
//
// Where the old right-rail sections went: KEY HYGIENE -> `ApiKeysHygieneNotes`, inline above the
// table; LIFECYCLE -> deleted, since `TypedConfirmDialog` carries that copy at the moment it
// matters. Account is not here: it is identity, and lives in the header.
export function ApiKeysControls({
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
}: ApiKeysControlsProps) {
  return (
    <section aria-label="Filters and actions" className={cn('flex flex-col gap-4', className)}>
      {/* The action leads: a key belongs to a project, so creating one is what you came for, and
          the project picker directly below it is the precondition. */}
      <div className="flex flex-col gap-1.5">
        <Button
          type="button"
          variant="primary"
          className="w-full"
          disabled={!onCreate}
          title={createDisabledReason}
          onClick={onCreate}>
          {createLabel}
        </Button>
        {!onCreate && createDisabledReason ? (
          <span className={LABEL_CLASS}>{createDisabledReason}</span>
        ) : null}
      </div>

      <SelectField {...projectField} />

      <div className="flex flex-col gap-1.5">
        <span className={LABEL_CLASS}>Status</span>
        <SegmentedControl
          aria-label="Status filter"
          options={statusOptions}
          value={statusValue}
          onChange={onStatusChange}
        />
      </div>

      <Field
        label="Search"
        placeholder="name or prefix…"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
      />
    </section>
  );
}
