import React from 'react';

import { cn } from '../../cn';
import { SegmentedControl } from '../../components/segmented-control';
import { SelectField } from '../../components/select-field';
import type { ManageControlsProps } from './types';

// Projects screen filter cluster (renamed from Manage, phase 5 revamp brief). Status and budget
// (quota) state are the same two fields `ManageFiltersRail` originally offered alongside account.
//
// 2026-08-30: `search` moved OUT of this component and into `ProjectsLedger`'s own toolbar (the
// table-scoped search field, leading the row) — this cluster is now table-scoped FILTERS only,
// rendered as the toolbar's trailing group (`ProjectsLedger`'s `filters` slot), not a mix of a
// text field and three selects that used to live in `PageHeader.controls` before the table even
// had its own toolbar.
//
// The `Account` select was deleted here (live findings #6, 2026-08-30): it duplicated the sidebar
// workspace switcher (`AccountBadge` variant="sidebar") one-for-one — both wrote the same account
// scope, and having two controls for one piece of state is the defect, not a feature. Account
// scope is owned exclusively by the switcher now; this cluster is status/budget-state only.
export function ManageControls({
  statusOptions,
  statusValue,
  onStatusChange,
  budgetStateValue,
  budgetStateOptions,
  onBudgetStateChange,
  className,
}: ManageControlsProps) {
  // Phase 9 — no external "Status" label: the segmented control's own cells already read the
  // status words. `Budget state`'s label stays hidden the same way, self-describing through its
  // chosen option text.
  return (
    <section aria-label="Filters" className={cn('flex flex-wrap items-end gap-3', className)}>
      <SegmentedControl
        aria-label="Project status"
        options={statusOptions}
        value={statusValue}
        onChange={onStatusChange}
      />

      <SelectField
        label="Budget state"
        layout="inline"
        hideLabel
        value={budgetStateValue}
        options={budgetStateOptions}
        onChange={onBudgetStateChange}
      />
    </section>
  );
}
