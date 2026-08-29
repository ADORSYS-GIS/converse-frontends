import React from 'react';
import { FloatingPortal } from '@floating-ui/react';

import type { ChartTooltipProps } from './types';

/**
 * Presentational tooltip card, positioned over a chart at a data point. Purely
 * presentational by design: which point is "active" is each chart primitive's own
 * state, passed down as `rows`/`title`; *where* the card sits is each chart's own
 * `useChartTooltipFloating()` call, passed down as `setFloating`/`floatingStyles`/
 * `getFloatingProps` (ADR 0010 Phase 3 rewrite -- see that hook's docstring for why the
 * Floating UI wiring lives one level up, in the component that renders the interactive
 * hit-region elements a pointer/tap/keyboard focus actually lands on, rather than here).
 *
 * DOM port of packages/ui's chart tooltip (RN View/Text -> div/span), still on
 * the console-ui token set. Its paint is one named class in theme.css
 * (chart-tooltip-card, and two parts under it): the card is the one
 * overlay that is deliberately not OVERLAY_CLASS, because a hairline border on
 * a card that tracks the cursor reads as flicker.
 *
 * Every part inside the card is positional rather than its own class name. The
 * rows are divs, so the optional title is the card's only direct span child.
 * Inside a row the value is the last child and the label the one before it,
 * which holds whether or not the row has a swatch in front.
 */
export function ChartTooltip({
  visible,
  title,
  rows,
  setFloating,
  floatingStyles,
  getFloatingProps,
}: ChartTooltipProps) {
  const open = visible && rows.length > 0;

  if (!open) {
    return null;
  }

  return (
    <FloatingPortal>
      <div
        ref={setFloating}
        style={{ ...floatingStyles, pointerEvents: 'none' }}
        {...getFloatingProps()}
        className="chart-tooltip-card">
        {title ? <span>{title}</span> : null}
        {rows.map((row) => (
          <div key={row.key} className="chart-tooltip-row">
            {row.color ? (
              <span className="chart-tooltip-dot" style={{ backgroundColor: row.color }} />
            ) : null}
            <span>{row.label}</span>
            <span>{row.value}</span>
          </div>
        ))}
      </div>
    </FloatingPortal>
  );
}
