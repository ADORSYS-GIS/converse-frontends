import React from 'react';

import { cn } from '../../cn';
import { Button } from '../../components/button';
import { SelectField } from '../../components/select-field';
import type { OverviewToolbarProps } from './types';

// Contract: owner review 2026-08-29 — replaces Overview's entire right rail (the VIEW, FILTERS,
// SERIES and EXPORT sections) with one horizontal strip above the dashboards.
//
// **Why the rail went.** The console-ui skill already described this exact model, but only below
// `lg`: "contextual icon-button triggers placed where they make sense — view/range controls
// beside the chart they configure, the export action near the data it exports." At `lg` the same
// controls were instead a permanent 280px column. That column cost a third of a 1440 viewport and
// 38% of a 1280 one, to host five dropdowns and a button — and it made `lg` the odd tier out,
// with its own composition, its own stories and its own bugs. Promoting the toolbar to every tier
// deletes the special case rather than adding one: there is now ONE arrangement of these controls,
// it is always visible (nothing hidden behind a trigger, so no `SectionSheet` on this screen at
// all), and it wraps instead of switching layouts.
//
// **What is deliberately NOT here:**
//
//  - **Account.** Scope is identity, not a filter — it belongs in the header once, as a name
//    (`AccountBadge`). It used to appear FOUR times on this screen: header, page subtitle, the
//    left rail's `Scope` echo, and the rail's own `Account` dropdown. Three of those are gone.
//  - **Series.** The SPEND chart already renders its own `ChartLegend`, and the share bar below
//    it lists the same series again. The rail's `SERIES` section was a third copy — its own
//    docstring called it "a convenience echo", which is the tell.
//
// Alignment: `items-end` so every control's bottom edge sits on one line despite the labels above
// them; the export action is pushed to the trailing edge by `ml-auto`, keeping the parameters and
// the action that consumes them at opposite ends of one row rather than stacked in one column.
export function OverviewToolbar({
  rangeField,
  bucketField,
  groupByField,
  projectField,
  modelField,
  onExport,
  exportLabel = 'Export CSV',
  exportDisabledReason,
  className,
}: OverviewToolbarProps) {
  return (
    <section
      aria-label="View and filters"
      className={cn('flex flex-wrap items-end gap-x-4 gap-y-3', className)}>
      <SelectField layout="inline" {...rangeField} />
      <SelectField layout="inline" {...bucketField} />
      <SelectField layout="inline" {...groupByField} />

      {/* A hairline between "what the chart is a picture of" and "which slice it is drawn from".
          `hidden sm:block` because once the row wraps, a vertical rule mid-wrap is noise. */}
      <span aria-hidden="true" className="bg-border hidden h-[30px] w-px sm:block" />

      <SelectField layout="inline" {...projectField} />
      <SelectField layout="inline" {...modelField} />

      {onExport || exportDisabledReason ? (
        <Button
          type="button"
          variant="secondary"
          className="ml-auto"
          disabled={!onExport}
          title={exportDisabledReason}
          onClick={onExport}>
          {exportLabel}
        </Button>
      ) : null}
    </section>
  );
}
