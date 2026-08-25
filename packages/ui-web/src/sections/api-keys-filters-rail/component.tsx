import React from 'react';

import { cn } from '../../cn';
import { Field } from '../../components/field';
import { fieldLabelClassName } from '../../components/field/cva';
import { SegmentedControl } from '../../components/segmented-control';
import type { ApiKeysFiltersRailProps } from './types';

/** Heading for whichever host mounts this section — see `OVERVIEW_VIEW_RAIL_LABEL`'s note. */
export const API_KEYS_FILTERS_RAIL_LABEL = 'FILTERS';

// Contract: docs/design/console-redesign/README.md §5.2 (api-keys.svg) — the right rail's FILTERS
// section: a status segmented control plus a name/prefix search. Both genuinely change what the
// ledger shows, which is why this section (unlike KEY HYGIENE and LIFECYCLE) gets a compact-tier
// trigger of its own in the table toolbar.
export function ApiKeysFiltersRail({
  statusOptions,
  statusValue,
  onStatusChange,
  search,
  onSearchChange,
  className,
}: ApiKeysFiltersRailProps) {
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-col gap-1.5">
        <span className={fieldLabelClassName}>Status</span>
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
    </div>
  );
}
