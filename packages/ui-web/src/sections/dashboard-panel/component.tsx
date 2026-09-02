import { Dialog } from '@base-ui/react/dialog';
import React, { useCallback, useId, useRef, useState } from 'react';

import { Button } from '../../components/button';
import { Card } from '../../components/card';
import { cn } from '../../cn';
import { DIALOG_BACKDROP_CLASS, DIALOG_POPUP_CLASS, DIALOG_TITLE_CLASS } from '../../lib/dialog';
import { ExpandIcon } from '../../lib/icons';
import { META_CLASS } from '../../lib/type-roles';
import { usePanelHotkey } from '../../lib/use-panel-hotkey';
import { ZoneHeading } from '../../lib/zone-heading';
import type { DashboardPanelProps } from './types';

/**
 * The one board wrapper every declarative dashboard panel renders through (converse-frontends#446,
 * decision D-E). `Card` (ADR 0012 D3 — the zone container console-wide, no per-page carve-outs)
 * plus `ZoneHeading` plus a body render-prop, and the zoom affordance that makes a two-column
 * grid workable at all: a two-up chart is half the width the same chart had in the old
 * single-column `/admin/overview`, so every panel gets a way back to full size.
 *
 * Three details that are contract rather than taste:
 *
 *  - **The Expand button is always present.** It is appended AFTER whatever `actions` the caller
 *    passes (a series panel's scale toggle, say) rather than merged into them, so a panel type
 *    cannot ship without a zoom affordance by forgetting to add one.
 *  - **The root is focusable (`tabIndex={0}`) with a visible ring.** That is what scopes the `v`
 *    hotkey: `usePanelHotkey` fires only when focus is inside THIS panel, so on a page of eight
 *    panels the key reaches exactly one. Tabbing to the panel itself counts as inside it.
 *  - **The body is a render-prop, not a node.** The expanded view is not a scaled-up screenshot
 *    of the panel: it draws with a taller chart, more axis ticks and a 50-row table page. Both
 *    renderings call the same function with a different `size`, which is why a panel type has
 *    exactly one body implementation rather than two that can drift.
 *
 * Expansion is dual-mode, the same contract `ChartLegend`/`DonutChart` use for selection: pass
 * `expanded`/`onExpandedChange` to control it (the console reflects the open panel in the URL),
 * or omit both and the panel tracks its own. Base UI's `Dialog` owns the modal behaviour — the
 * scrim, the focus trap, `Esc` to close, and returning focus to whatever opened it, which here is
 * the panel root itself because that is where the hotkey fired from.
 */
export function DashboardPanel({
  id,
  title,
  subtitle,
  actions,
  children,
  span = 1,
  chrome = 'card',
  expanded,
  onExpandedChange,
  hotkey = 'v',
  className,
}: DashboardPanelProps) {
  const rootRef = useRef<HTMLElement>(null);
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isControlled = expanded !== undefined;
  const isExpanded = isControlled ? expanded : internalExpanded;
  const titleId = `${useId()}-${id}-title`;

  const setExpanded = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalExpanded(next);
      onExpandedChange?.(next);
    },
    [isControlled, onExpandedChange]
  );

  // Only armed while the panel is closed: once the dialog is open, focus lives inside the portal
  // (outside `rootRef`), so the guard would refuse anyway — disarming says so explicitly instead
  // of relying on that coincidence.
  const openExpanded = useCallback(() => setExpanded(true), [setExpanded]);
  // Armed only while the panel is closed AND has something to expand to. A `bare` panel is a
  // self-panelling stat with no zoomed reading of its own (see `DashboardPanelProps.chrome`), so
  // `v` inside one must do nothing rather than open an empty dialog.
  usePanelHotkey(hotkey, rootRef, openExpanded, !isExpanded && chrome === 'card');

  const heading = (
    <span>
      {title}
      {subtitle ? (
        <span className={cn(META_CLASS, 'dashboard-panel-subtitle')}>{subtitle}</span>
      ) : null}
    </span>
  );

  // `data-span` rather than a second class on either branch: `dashboard-grid`'s own block reads
  // the attribute to decide the column span, so the span axis costs no hand-written utility
  // (class-budget.test.ts).
  const gridProps = {
    ref: rootRef,
    'data-span': span === 2 ? ('2' as const) : undefined,
    tabIndex: 0,
    'aria-label': title,
  };

  return (
    <>
      {chrome === 'bare' ? (
        // A self-panelling body (`StatCard`/`OverviewStatRow`) — see `DashboardPanelProps.chrome`
        // for why it gets no card and no heading row. Still a grid item, still focusable.
        <div
          {...gridProps}
          // The ref is typed `HTMLElement` because the carded branch below hands it to a
          // `<section>`; a `<div>` is one, so this is a widening, not a cast to something the
          // element is not.
          ref={rootRef as React.RefObject<HTMLDivElement>}
          className={cn('dashboard-panel-bare', className)}>
          {children({ size: 'panel' })}
          {/* The subtitle survives the missing heading row. These are honesty captions — "only
              counts actors with usage in this window", "blank when the window carries no token
              counts at all" — and dropping one because the panel has no title row would be exactly
              the silent omission the console-ui skill's caption rule exists to prevent. */}
          {subtitle ? (
            <p className={cn(META_CLASS, 'dashboard-panel-subtitle')}>{subtitle}</p>
          ) : null}
        </div>
      ) : (
        <Card {...gridProps} className={cn('dashboard-panel', className)}>
          <ZoneHeading
            label={heading}
            actions={
              <>
                {actions}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Expand ${title}`}
                  onClick={openExpanded}>
                  <ExpandIcon />
                </Button>
              </>
            }
          />
          <div className="dashboard-panel-body">{children({ size: 'panel' })}</div>
        </Card>
      )}

      {/* A `bare` panel has no zoomed reading and no way to open one — no dialog is mounted at
          all, rather than an unreachable one kept around for symmetry. */}
      <Dialog.Root
        open={chrome === 'card' && isExpanded}
        onOpenChange={(next) => {
          if (!next) setExpanded(false);
        }}>
        <Dialog.Portal>
          <Dialog.Backdrop className={DIALOG_BACKDROP_CLASS} />
          <Dialog.Popup
            aria-labelledby={titleId}
            // `finalFocus` lands on the PANEL ROOT, not on whatever Base UI would restore to by
            // default. The default is "whatever had focus when the dialog opened", which is the
            // Expand button when the pointer opened it but is already the root when `v` did — and
            // after a close the user's next `v` should work immediately, which it only does with
            // focus inside the panel. Pinning it to the root makes both entry paths end in the
            // same place (the AC's "Esc closes it and focus returns to the panel").
            finalFocus={rootRef}
            className={cn(DIALOG_POPUP_CLASS, 'dashboard-expanded-popup')}>
            <Dialog.Title id={titleId} className={DIALOG_TITLE_CLASS}>
              {title}
            </Dialog.Title>
            {subtitle ? <p className={META_CLASS}>{subtitle}</p> : null}
            <div className="dashboard-expanded-body">{children({ size: 'expanded' })}</div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
