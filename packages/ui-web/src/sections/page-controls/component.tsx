import React from 'react';

import { cn } from '../../cn';
import { Button } from '../../components/button';
import type { PageControlsGroup, PageControlsProps } from './types';

/**
 * The screen's parameter row — range picker, lens/status segments, search, page size, reset —
 * standing on the FLOOR between `PageHeader` and the first `Card`.
 *
 * **Owner directive, 2026-09-03: "Re-touch the UI so that filters are outside cards."** ADR 0015
 * amendment A2 supersedes ADR 0012 D3's ledger clause ("toolbar + table + pager inside one
 * `Card`"): a `Card` now holds CONTENT only. Two things moved to make that true, and both are hard
 * cutovers — no compatibility slot was left behind on either side:
 *
 *  - Every ledger's in-card toolbar is gone. `ProjectsLedger` no longer draws a search box and a
 *    `filters` slot above its table, `ApiKeysLedger` has no `toolbarActions`, `PlatformRoleGrants`
 *    has no filter selects. What each of those rows contained is a group in this component now.
 *  - `PageHeader.controls` is deleted. The title row carries a title, a subtitle and at most one
 *    action; a range picker crammed against a `+ New key` button was the reason the two kept
 *    fighting for the same trailing edge at every tier below `xl`.
 *
 * **What is NOT a filter, and therefore is not here.** A `ZoneHeading`'s own knobs — a chart's
 * linear/log scale toggle, a panel's Expand — stay on the panel. They are panel-scoped: they change
 * how ONE card draws the data it already has, while everything in this row changes WHICH data every
 * card on the page is drawing. The test for a new control is whether moving it here would leave two
 * panels disagreeing about what it did.
 *
 * **Reference lock** (Refero, 2026-09-03 — recorded in `docs/design/console-redesign/README.md`
 * §3): Chargetrip Analytics and Dub Analytics both put a bare, unboxed control row under the page
 * title with filters leading and page-scoped actions trailing, and start the metric cards below it.
 * Anam's session history is the rejected shape — its filter bar lives inside the table's own card,
 * which is exactly what this row replaces. Geometry, the divider rule and why the row is NOT sticky
 * live in `theme.css`'s `page-controls` block.
 *
 * Presentational only: it renders the groups it is handed, in order, and owns nothing but the
 * dividers between them.
 */
export function PageControls({
  label = 'Filters',
  groups,
  onReset,
  resetLabel = 'Reset filters',
  className,
}: PageControlsProps) {
  // Reset is an ordinary trailing group rather than a special case in the markup, so the divider
  // before it and its own accessible name come from the same two lines every other group uses.
  const rendered: PageControlsGroup[] = onReset
    ? [
        ...groups,
        {
          id: 'reset',
          label: resetLabel,
          align: 'end',
          children: (
            <Button type="button" variant="ghost" size="sm" onClick={onReset}>
              {resetLabel}
            </Button>
          ),
        },
      ]
    : groups;

  // A row with nothing in it is not an empty row, it is no row — a screen with no parameters must
  // not grow 1.5rem of blank floor between its title and its first card.
  if (rendered.length === 0) return null;

  // `margin-inline-start: auto` is what pushes a group to the trailing edge, and flexbox SPLITS
  // the free space between every element that claims it. So only the FIRST `end` group carries the
  // marker — the ones after it simply follow, which is the "Export then Per-page, both hard right"
  // reading the references show and not "Export a third of the way across".
  const firstEnd = rendered.findIndex((group) => group.align === 'end');

  return (
    <section aria-label={label} className={cn('page-controls', className)}>
      {rendered.map((group, index) => (
        <React.Fragment key={group.id}>
          {/* A hairline parts one group from the next — except before the group that claims the
              trailing edge, where the whole width of the row already separates them and a rule
              would hang in space with nothing on its right. `aria-hidden` and not an `<hr>`: the
              separation it draws is already stated to a screen reader by the groups having names. */}
          {index > 0 && index !== firstEnd ? (
            <span aria-hidden className="page-controls-divider" />
          ) : null}
          <div
            role="group"
            aria-label={group.label}
            data-group={group.id}
            data-align={index === firstEnd ? 'end' : 'start'}
            className="page-controls-group">
            {group.children}
          </div>
        </React.Fragment>
      ))}
    </section>
  );
}
