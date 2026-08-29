import type React from 'react';

export type TooltipSide = 'top' | 'right' | 'bottom' | 'left';
export type TooltipAlign = 'start' | 'center' | 'end';

export interface TooltipProps {
  /**
   * What the tooltip says. Short — the full text of a truncated cell, the name behind an
   * icon-only button, the expansion of an abbreviated label. A tooltip is never the only place a
   * fact lives, so this must not carry information the screen cannot show another way.
   *
   * `null`/`undefined` renders the child with no tooltip wiring at all, so a caller can pass a
   * possibly-absent title without branching.
   */
  content?: React.ReactNode;
  /**
   * The element the tooltip anchors to. It is rendered AS the trigger — no wrapper element is
   * introduced, so this composes with a table cell or an existing button without changing layout.
   */
  children: React.ReactElement;
  side?: TooltipSide;
  align?: TooltipAlign;
  /** Gap between the trigger and the popup, in px. */
  sideOffset?: number;
  /** Hover open delay in ms. Base UI's default is 600. */
  delay?: number;
  /** Extra classes for the popup. */
  className?: string;
}
