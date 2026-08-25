import { useCallback, useState } from 'react';
import type { FocusEvent, PointerEvent } from 'react';

export interface HoverActiveProps {
  onPointerEnter: (event: PointerEvent) => void;
  onPointerLeave: (event: PointerEvent) => void;
  onFocus: (event: FocusEvent) => void;
  onBlur: (event: FocusEvent) => void;
}

/**
 * Drives which datum/bucket/row a chart's `ChartTooltip` is anchored to, continuously, off
 * pointer and keyboard-focus movement across a set of per-datum hit-region elements (the
 * existing `<button>` overlays in `spend-series-chart`/`histogram-chart`/`latency-ridgeline`,
 * already sized to tile the plotted area) -- fixing the console-ui skill's chart-tooltip
 * interaction contract ("virtual mouse move around d3 stuffs", ADR 0010 Decision 6): the
 * Floating UI rewrite in #240 built the positioning half of that contract but left every chart
 * wired to `onClick` only, so hovering a chart surfaced nothing until you clicked.
 *
 * Fine pointers (mouse/pen) and keyboard focus track live: entering a hit-region activates it,
 * leaving clears it, matching a conventional chart crosshair. A touch pointer activates the same
 * way on contact, but `pointerLeave` is skipped for it -- a touch pointer's `pointerleave` fires
 * on lift (the touch pointer ceases to exist once contact ends, unlike a mouse that keeps
 * hovering), so honouring it would flash the tooltip for a single frame per tap instead of
 * leaving it up. That gives "tap shows the tooltip" (spec) rather than "tap flashes it".
 *
 * Deliberately independent of any click/select state a chart also tracks (`onClick` stays wired
 * to whatever selection/breach semantics that chart already had) -- this hook only ever answers
 * "what should the tooltip point at right now", never "what is selected".
 */
export function useHoverActive<T>(): {
  active: T | null;
  setActive: (value: T | null) => void;
  getHoverProps: (value: T) => HoverActiveProps;
} {
  const [active, setActive] = useState<T | null>(null);

  const getHoverProps = useCallback(
    (value: T): HoverActiveProps => ({
      onPointerEnter: () => setActive(value),
      onPointerLeave: (event) => {
        if (event.pointerType === 'touch') return;
        setActive((current) => (current === value ? null : current));
      },
      onFocus: () => setActive(value),
      onBlur: () => setActive((current) => (current === value ? null : current)),
    }),
    [],
  );

  return { active, setActive, getHoverProps };
}
