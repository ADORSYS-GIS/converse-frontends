import React from 'react';

import { cn } from '../../cn';
import { Field } from '../../components/field';
import { SegmentedControl } from '../../components/segmented-control';
import { SelectField } from '../../components/select-field';
import { LABEL_CLASS } from '../../lib/type-roles';
import type { ApiKeysControlsProps } from './types';

// Shell brief (2026-08-30) — the Api-Keys screen's parameters, now a HORIZONTAL compact cluster in
// `PageHeader.controls` rather than a stack in the left rail: the rail is gone, and every screen's
// own knobs move to its `PageHeader` instead. `+ New key` is no longer here at all — it is
// `PageHeader.action`, the emphasised, right-most control on the title row, not one filter among
// several.
//
// Where the old right-rail sections went: KEY HYGIENE -> `ApiKeysHygieneNotes`, inline above the
// table; LIFECYCLE -> deleted, since `TypedConfirmDialog` carries that copy at the moment it
// matters. Account is not here: it is identity, and lives in the sidebar's workspace switcher.
export function ApiKeysControls({
  projectField,
  statusOptions,
  statusValue,
  onStatusChange,
  search,
  onSearchChange,
  className,
}: ApiKeysControlsProps) {
  return (
    <section aria-label="Filters and actions" className={cn('flex flex-wrap items-end gap-3', className)}>
      <SelectField {...projectField} layout="inline" />

      <div className="flex items-center gap-2">
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
        layout="inline"
        placeholder="name or prefix…"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
      />
    </section>
  );
}
