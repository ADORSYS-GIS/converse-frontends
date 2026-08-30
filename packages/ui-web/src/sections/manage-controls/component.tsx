import React from 'react';

import { cn } from '../../cn';
import { Field } from '../../components/field';
import { SegmentedControl } from '../../components/segmented-control';
import { SelectField } from '../../components/select-field';
import { LABEL_CLASS } from '../../lib/type-roles';
import type { ManageControlsProps } from './types';

// Shell revamp phase 3 (right rail out) — the Manage screen's parameters, now a HORIZONTAL
// compact cluster in `PageHeader.controls` (the same `OverviewControls`/`ApiKeysControls` pattern,
// see either's own docstring) rather than the deleted right-hand aside's FILTERS section. Account,
// status and budget (quota) state are the same three fields `ManageFiltersRail` offered; search
// moves in from the ledger's own toolbar row, which no longer has one now that `+ New project`
// and `Monthly report` are both `PageHeader.action` (see `manage-centre.tsx`).
export function ManageControls({
  accountValue,
  accountOptions,
  onAccountChange,
  statusOptions,
  statusValue,
  onStatusChange,
  budgetStateValue,
  budgetStateOptions,
  onBudgetStateChange,
  search,
  onSearchChange,
  className,
}: ManageControlsProps) {
  return (
    <section aria-label="Filters" className={cn('flex flex-wrap items-end gap-3', className)}>
      <SelectField
        label="Account"
        layout="inline"
        value={accountValue}
        options={accountOptions}
        onChange={onAccountChange}
      />

      <div className="flex items-center gap-2">
        <span className={LABEL_CLASS}>Status</span>
        <SegmentedControl
          aria-label="Project status"
          options={statusOptions}
          value={statusValue}
          onChange={onStatusChange}
        />
      </div>

      <SelectField
        label="Budget state"
        layout="inline"
        value={budgetStateValue}
        options={budgetStateOptions}
        onChange={onBudgetStateChange}
      />

      <Field
        label="Search"
        layout="inline"
        placeholder="Find a project…"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
      />
    </section>
  );
}
