import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import React from 'react';

import { cn } from '../../cn';
import { OVERLAY_CLASS } from '../../lib/overlay';
import type { TooltipProps } from './types';

// PRIMITIVE-MATRIX row 47. The console had no element-anchored tooltip at all: `chart-tooltip` is
// point-anchored (Floating UI virtual element + `useClientPoint`, which is the sanctioned use of
// Floating UI — positioning against a POINT inside an `<svg>`) and cannot anchor to a DOM node, so
// truncated ledger cells, icon-only buttons and abbreviated labels had no hover/focus affordance.
//
// Base UI owns the behaviour (ADR 0010 Decision 2): open/close timing, the safe-polygon hover
// path into the popup, dismissal, `aria-describedby` on the trigger, and the portal. daisy's own
// `tooltip` class stays rejected — it is pure CSS driven by a `data-tip` attribute drawn as a
// `::before` on the trigger, so it cannot portal out of an `overflow-hidden`/`overflow-x-auto`
// ancestor. Every ledger in this console scrolls inside exactly such a container, which is where
// a tooltip is most needed and where a CSS-only one is clipped.
//
// Paint is `OVERLAY_CLASS`, the same hairline every other overlay carries.
export function Tooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  sideOffset = 6,
  delay,
  className,
}: TooltipProps) {
  // Local open state, which is one of the sanctioned `useState` cases (hover/tooltip tracking) and
  // is needed for a real reason: Base UI 1.7.0's Tooltip wires NO aria at all — it emits neither
  // `role="tooltip"` on the popup nor `aria-describedby` on the trigger (verified against the
  // installed package: no `describedby` and no `'tooltip'` role anywhere under
  // `@base-ui/react/tooltip`, unlike Dialog/Popover, which do). Without both, the tooltip is a
  // purely visual affordance and a screen reader never reaches it. `aria-describedby` is pointed
  // at the popup only while it is mounted, so it never dangles.
  const [open, setOpen] = React.useState(false);
  const popupId = React.useId();

  // No content, no tooltip — and no stray trigger wrapper or tab stop either.
  if (content === null || content === undefined || content === '') {
    return children;
  }

  return (
    <BaseTooltip.Root open={open} onOpenChange={setOpen}>
      <BaseTooltip.Trigger
        delay={delay}
        aria-describedby={open ? popupId : undefined}
        // The common anchor is a non-interactive element — a truncated `<span>` in a ledger row,
        // an abbreviated label — which has no tab stop of its own, and keyboard focus MUST open
        // the tooltip (WCAG 1.4.13; hover-only would make the content mouse-exclusive). A
        // `tabIndex` the child already declares wins, and `tabIndex={0}` on an element that is
        // natively focusable (a `<button>`, an `<a href>`) is a no-op, so this is safe for every
        // kind of child.
        tabIndex={(children.props as { tabIndex?: number }).tabIndex ?? 0}
        // Making an arbitrary element focusable also gives it the USER-AGENT focus ring, which
        // Chrome draws in the viewer's OS accent colour with `outline-style: auto`'s rounded
        // corners — verified on a machine whose accent is orange: a `rgb(229,151,0)` pill around a
        // ledger cell, off-palette and off-shape. So the trigger takes the console's own focus
        // treatment, the same one `Button` and `AccountMenu` use. Base UI merges this with the
        // child's own `className`, and a child that already carries this ring just gets it twice
        // to the same effect.
        className="focus-visible:ring-primary rounded-[2px] focus-visible:ring-1 focus-visible:outline-hidden"
        render={children}
      />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner
          side={side}
          align={align}
          sideOffset={sideOffset}
          className="z-50 outline-hidden">
          <BaseTooltip.Popup
            id={popupId}
            role="tooltip"
            className={cn(
              'text-soft max-w-[280px] px-2 py-1 font-mono text-[11px]',
              OVERLAY_CLASS,
              className
            )}>
            {content}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}

/**
 * Shared hover/focus delay for a cluster of tooltips: once one has opened, its neighbours open
 * instantly instead of each serving its own 600ms wait. Mount it around a toolbar of icon-only
 * buttons or a ledger's header row — never around the whole app, which would make one stray hover
 * arm every tooltip on the page.
 */
export const TooltipGroup = BaseTooltip.Provider;
