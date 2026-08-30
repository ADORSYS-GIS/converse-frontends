import React from 'react';

import { cn } from '../../cn';
import { SegmentedControl } from '../../components/segmented-control';
import { SelectField } from '../../components/select-field';
import { LABEL_CLASS } from '../../lib/type-roles';
import type { ManageControlsProps } from './types';

// Projects screen filter cluster (renamed from Manage, phase 5 revamp brief). Account, status and
// budget (quota) state are the same three fields `ManageFiltersRail` originally offered.
//
// 2026-08-30: `search` moved OUT of this component and into `ProjectsLedger`'s own toolbar (the
// table-scoped search field, leading the row) — this cluster is now table-scoped FILTERS only,
// rendered as the toolbar's trailing group (`ProjectsLedger`'s `filters` slot), not a mix of a
// text field and three selects that used to live in `PageHeader.controls` before the table even
// had its own toolbar.
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
    </section>
  );
}
