import React from 'react';

import { SegmentedControl } from '../../components/segmented-control';
import { SelectField } from '../../components/select-field';
import type { ManageControlsProps } from './types';

// The Projects screen's filters — status and budget (quota) state.
//
// 2026-09-03 (owner directive "filters are outside cards", ADR 0015 amendment A2): a FRAGMENT, not
// a `<section>` with its own flex row, and it no longer sits INSIDE `ProjectsLedger`'s card. The
// ledger's whole toolbar is gone — its search box moved out with these two, and all three are
// groups in `PageControls`, the page-level control row on the floor. The `Card` below holds the
// table and its pager and nothing else.
//
// The `Account` select was deleted here (live findings #6, 2026-08-30): it duplicated the sidebar
// workspace switcher (`AccountBadge` variant="sidebar") one-for-one — both wrote the same account
// scope, and having two controls for one piece of state is the defect, not a feature.
export function ManageControls({
  statusOptions,
  statusValue,
  onStatusChange,
  budgetStateValue,
  budgetStateOptions,
  onBudgetStateChange,
}: ManageControlsProps) {
  // Phase 9 — no external "Status" label: the segmented control's own cells already read the
  // status words. `Budget state`'s label stays hidden the same way, self-describing through its
  // chosen option text.
  return (
    <>
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
    </>
  );
}
