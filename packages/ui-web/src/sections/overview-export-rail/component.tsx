import React from 'react';

import { cn } from '../../cn';
import { Button } from '../../components/button';
import type { OverviewExportRailProps } from './types';

/** Heading for whichever host mounts this section — see `OVERVIEW_VIEW_RAIL_LABEL`'s note. */
export const OVERVIEW_EXPORT_RAIL_LABEL = 'EXPORT';

// Contract: docs/design/console-redesign/README.md §5.1 — the right rail's EXPORT section. The
// rail owns the action that consumes its own parameters: this exports exactly the view the VIEW
// and FILTERS sections above it describe.
export function OverviewExportRail({
  onExport,
  label = 'Export current view · CSV',
  caption,
  disabled = false,
  className,
}: OverviewExportRailProps) {
  return (
    <section className={cn('flex flex-col gap-2', className)} aria-label="Export">
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={onExport}
        disabled={disabled}>
        {label}
      </Button>
      {caption ? <p className="text-subtle font-sans text-[10px]">{caption}</p> : null}
    </section>
  );
}
