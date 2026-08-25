import { useEffect, useLayoutEffect, useState } from 'react';
import type { CSSProperties, HTMLProps } from 'react';
import {
  autoUpdate,
  flip,
  offset,
  shift,
  useClientPoint,
  useFloating,
  useInteractions,
} from '@floating-ui/react';
import type { ReferenceType } from '@floating-ui/react';

export interface ChartTooltipPoint {
  x: number;
  y: number;
}

export interface UseChartTooltipFloatingArgs {
  open: boolean;
  /** The chart's real `<svg>` -- both the virtual element's `contextElement` (clipping
   *  detection, `autoUpdate`'s scroll/resize tracking) and the element `pinnedPoint` is
   *  measured against. */
  anchorElement: Element | null;
  /**
   * `null` while a live pointer (mouse/pen) is driving the active datum: `useClientPoint` is
   * left to track the real, continuously-moving cursor position itself (its documented default
   * behaviour -- see `floating-ui.com/docs/useClientPoint`), which is what makes the tooltip
   * actually follow the mouse instead of the datum it happens to be sitting over.
   *
   * Non-null when there is no cursor to track -- a touch tap or a keyboard-focus move -- in
   * which case this is the anchor's own local point (its content-box top-left origin) to pin
   * the tooltip at instead, exactly as `ChartTooltip` did unconditionally before this hook
   * existed.
   *
   * Passing *any* non-null `x`/`y` into `useClientPoint` freezes it: the library's own
   * `addListener` effect explicitly skips attaching its pointer-tracking listener whenever
   * `x != null || y != null`. That is the root cause `ChartTooltip` shipped with -- every chart
   * always passed a fixed, datum-derived point, so the "live mouse tracking" `useClientPoint`
   * exists to provide was permanently switched off, in every chart, regardless of pointer type.
   */
  pinnedPoint: ChartTooltipPoint | null;
}

export interface UseChartTooltipFloatingResult {
  setFloating: (node: HTMLElement | null) => void;
  floatingStyles: CSSProperties;
  getFloatingProps: () => Record<string, unknown>;
  /**
   * Spread (merged with the chart's own per-datum `useHoverActive` handlers, e.g.
   * `getReferenceProps(getHoverProps(index))`) onto every hit-region element that can activate
   * the tooltip. Required for live cursor-following to work at all: `useClientPoint` seeds its
   * initial point and continuously live-tracking `mousemove` off these handlers, not off
   * `anchorElement` alone.
   */
  getReferenceProps: (userProps?: HTMLProps<Element>) => Record<string, unknown>;
}

/**
 * Owns the Floating UI positioning (`useFloating` + `useClientPoint` + a virtual element) shared
 * by every chart's tooltip (`spend-series-chart`, `histogram-chart`, `latency-ridgeline`,
 * `donut-chart`) -- extracted out of `ChartTooltip` itself so it can be called where the
 * interactive hit-region elements actually live (each chart component), not inside the
 * purely-presentational tooltip card. `useClientPoint` can only live-track a real pointer if its
 * `reference` handlers (`getReferenceProps`) are spread onto the elements the pointer is
 * actually moving over; `ChartTooltip` never rendered those elements, so that wiring was
 * structurally impossible before this hook existed (owner feedback on #247, "tooltip that
 * appears CLOSE TO THE MOUSE when hovering").
 */
export function useChartTooltipFloating({
  open,
  anchorElement,
  pinnedPoint,
}: UseChartTooltipFloatingArgs): UseChartTooltipFloatingResult {
  const {
    refs: { setReference, setFloating },
    floatingStyles,
    context,
  } = useFloating<ReferenceType>({
    open,
    placement: 'top',
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
    middleware: [offset(12), flip({ padding: 8 }), shift({ padding: 8 })],
  });

  useLayoutEffect(() => {
    setReference(anchorElement);
  }, [setReference, anchorElement]);

  // Forces a fresh `getBoundingClientRect()` read below on scroll/resize -- the chart's own
  // container (the centre column, per the console-ui skill's sticky-rails/scrolling-centre
  // contract) can scroll while the tooltip is open, and a pinned point computed once at open
  // time would otherwise drift away from the anchor it is meant to track.
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

  const anchorRect = open && anchorElement ? anchorElement.getBoundingClientRect() : null;
  const clientPoint = useClientPoint(context, {
    enabled: open,
    x: pinnedPoint && anchorRect ? anchorRect.left + pinnedPoint.x : null,
    y: pinnedPoint && anchorRect ? anchorRect.top + pinnedPoint.y : null,
  });

  const { getReferenceProps, getFloatingProps } = useInteractions([clientPoint]);

  return { setFloating, floatingStyles: floatingStyles as CSSProperties, getFloatingProps, getReferenceProps };
}
