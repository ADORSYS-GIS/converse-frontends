import React, { useEffect, useLayoutEffect, useState } from 'react';
import {
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useClientPoint,
  useFloating,
  useInteractions,
} from '@floating-ui/react';

import type { ChartTooltipProps } from './types';

/**
 * Presentational tooltip card, positioned over a chart at a data point. Purely
 * presentational by design: which point is "active" is each chart primitive's own
 * state, passed down as `x`/`y`/`rows` in the chart's own `<svg>` pixel space.
 *
 * ADR 0010 Phase 3 rewrite: positioning is **Floating UI** (`useFloating` +
 * `useClientPoint` + a virtual element), not hand-computed arithmetic. The deleted
 * approach clamped `left = x - width / 2` against a `containerWidth` prop and
 * guessed the card's height (`estimatedHeight = 16 + (title ? 16 : 0) +
 * rows.length * 18`) to avoid a measure-then-reposition flash -- an estimate that
 * was wrong whenever a row wrapped and had no flip/shift behaviour near an edge.
 * `flip`/`shift` middleware now measure the real card and reposition it, so both
 * the estimate and the `containerWidth`/`width` props are gone.
 *
 * `useClientPoint` positions the floating element at a client (viewport) point.
 * Its `x`/`y` are normally raw mouse coordinates; here they are the anchor's local
 * `x`/`y` (the snapped-to-datum point, not the raw cursor -- floating-ui/docs
 * `useClientPoint.mdx`) converted to client space via `anchorElement`'s own
 * `getBoundingClientRect()`, recomputed on every scroll/resize so the tooltip
 * tracks the chart rather than a client point frozen at open-time. `anchorElement`
 * doubles as the virtual element's `contextElement` (floating-ui/docs
 * `virtual-elements.mdx`) so clipping detection and `autoUpdate` see the real
 * chart `<svg>`.
 *
 * DOM port of `@lightbridge/ui`'s `chart-tooltip` (RN `View`/`Text` ->
 * `<div>`/`<span>`), still using the console-ui token set (`bg-surface`,
 * `text-ink`, `text-subtle`).
 */
export function ChartTooltip({ visible, anchorElement, x, y, title, rows }: ChartTooltipProps) {
  const open = visible && rows.length > 0 && anchorElement !== null;

  // `setReference`/`setFloating` are destructured straight out of the hook call, not read as
  // `refs.setReference` later -- member access on the returned `refs` object taints it for the
  // `react-hooks/refs` lint rule ("Cannot access refs during render"), which cannot tell a
  // floating-ui ref-setter function apart from a real `.current` read (see `spend-dashboard`'s
  // `useResizeObserver` note for the same pattern).
  const {
    refs: { setReference, setFloating },
    floatingStyles,
    context,
  } = useFloating({
    open,
    placement: 'top',
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
    middleware: [offset(8), flip({ padding: 8 }), shift({ padding: 8 })],
  });

  useLayoutEffect(() => {
    setReference(anchorElement);
  }, [setReference, anchorElement]);

  // Forces a fresh `getBoundingClientRect()` read below on scroll/resize -- the
  // chart's own container (the centre column, per the console-ui skill's sticky-
  // rails/scrolling-centre contract) can scroll while the tooltip is open, and a
  // client point computed once at open-time would otherwise drift away from the
  // anchor it is meant to track.
  const [, retrack] = useState(0);
  useEffect(() => {
    if (!open) return;
    const handle = () => retrack((n) => n + 1);
    window.addEventListener('scroll', handle, true);
    window.addEventListener('resize', handle);
    return () => {
      window.removeEventListener('scroll', handle, true);
      window.removeEventListener('resize', handle);
    };
  }, [open]);

  const anchorRect = open ? anchorElement.getBoundingClientRect() : null;
  const clientPoint = useClientPoint(context, {
    enabled: open,
    x: anchorRect ? anchorRect.left + x : null,
    y: anchorRect ? anchorRect.top + y : null,
  });

  const { getFloatingProps } = useInteractions([clientPoint]);

  if (!open) {
    return null;
  }

  return (
    <FloatingPortal>
      <div
        ref={setFloating}
        style={{ ...floatingStyles, pointerEvents: 'none' }}
        {...getFloatingProps()}
        className="flex max-w-[240px] flex-col gap-1 rounded-[2px] bg-surface px-2.5 py-2 font-mono">
        {title ? <span className="truncate text-[11px] text-subtle">{title}</span> : null}
        {rows.map((row) => (
          <div key={row.key} className="flex items-center gap-1.5">
            {row.color ? (
              <span
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: row.color }}
              />
            ) : null}
            <span className="flex-1 truncate text-xs text-ink">{row.label}</span>
            <span className="text-xs tabular-nums text-ink">{row.value}</span>
          </div>
        ))}
      </div>
    </FloatingPortal>
  );
}
