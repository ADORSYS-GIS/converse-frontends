import React from 'react';

import { cn } from '../../cn';
import { fieldLabelClassName } from '../../components/field/cva';
import { RailSelect } from '../../components/rail-select';
import { SegmentedControl } from '../../components/segmented-control';
import type { ManageFiltersRailProps } from './types';

/** Heading for whichever host mounts this section — see `OVERVIEW_VIEW_RAIL_LABEL`'s note. */
export const MANAGE_FILTERS_RAIL_LABEL = 'FILTERS';

// Contract: docs/design/console-redesign/README.md §5.3 (manage-projects.svg) — the right rail's
// FILTERS section: account, status and budget-state. The two dropdowns are `RailSelect`s, the
// same control the Overview rail uses; the old hand-rolled `selectClassName()` copy that lived in
// the deleted `ManagePage` is gone with it.
export function ManageFiltersRail({
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
}: ManageFiltersRailProps) {
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <RailSelect
        label="Account"
        value={accountValue}
        options={accountOptions}
        onChange={onAccountChange}
      />
      <div className="flex flex-col gap-1.5">
        <span className={fieldLabelClassName}>Status</span>
        <SegmentedControl
          aria-label="Project status"
          options={statusOptions}
          value={statusValue}
          onChange={onStatusChange}
        />
      </div>
      <RailSelect
        label="Budget state"
        value={budgetStateValue}
        options={budgetStateOptions}
        onChange={onBudgetStateChange}
      />
    </div>
  );
}
