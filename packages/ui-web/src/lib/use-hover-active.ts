import { useCallback, useState } from 'react';
import type { FocusEvent, PointerEvent } from 'react';

export interface HoverActiveProps {
  onPointerEnter: (event: PointerEvent) => void;
  onPointerLeave: (event: PointerEvent) => void;
  onFocus: (event: FocusEvent) => void;
  onBlur: (event: FocusEvent) => void;
}

/**
 * How the currently-active value was activated -- distinguishes a live, continuously-moving
 * fine pointer (mouse/pen) from a single frozen point (a touch tap, or a keyboard focus move)
 * so a caller wiring `ChartTooltip`'s positioning (`use-chart-tooltip-floating`) knows whether
 * to let the tooltip live-track the cursor or pin it at the datum's own coordinates -- there is
 * no cursor to track for either 'touch' (the finger has already lifted by the time anything
 * renders) or 'keyboard' (there was never a pointer at all).
 */
export type ActiveInput = 'hover' | 'touch' | 'keyboard';

/**
 * Drives which datum/bucket/row a chart's `ChartTooltip` is anchored to, continuously, off
 * pointer and keyboard-focus movement across a set of per-datum hit-region elements (the
 * existing `<button>` overlays in `spend-series-chart`/`histogram-chart`, already sized to tile
 * the plotted area) -- fixing the console-ui skill's chart-tooltip
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
  activeInput: ActiveInput | null;
  setActive: (value: T | null) => void;
  getHoverProps: (value: T) => HoverActiveProps;
} {
  const [state, setState] = useState<{ value: T; input: ActiveInput } | null>(null);

  const setActive = useCallback((value: T | null) => {
    setState((current) => {
      if (value === null) return null;
      // Programmatic activation (e.g. a legend hover forwarding into this hook) has no pointer
      // or focus event behind it -- closest existing bucket is 'hover' (live-trackable), since
      // it is not a frozen touch/keyboard point either.
      return { value, input: current?.value === value ? current.input : 'hover' };
    });
  }, []);

  const getHoverProps = useCallback(
    (value: T): HoverActiveProps => ({
      onPointerEnter: (event) => {
        setState({ value, input: event.pointerType === 'touch' ? 'touch' : 'hover' });
      },
      onPointerLeave: (event) => {
        if (event.pointerType === 'touch') return;
        setState((current) => (current?.value === value ? null : current));
      },
      onFocus: () => setState({ value, input: 'keyboard' }),
      onBlur: () => setState((current) => (current?.value === value ? null : current)),
    }),
    []
  );

  return {
    active: state?.value ?? null,
    activeInput: state?.input ?? null,
    setActive,
    getHoverProps,
  };
}
