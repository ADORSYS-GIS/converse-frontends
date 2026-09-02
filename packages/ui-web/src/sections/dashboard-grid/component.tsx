import React from 'react';

import { cn } from '../../cn';
import type { DashboardGridProps } from './types';

/**
 * The layout a declarative dashboard page lays its panels out in (converse-frontends#446,
 * decision D-D): one column below `lg`, two columns at `lg` and up, `gap-6` between them.
 *
 * This replaces `/admin/overview`'s single `flex flex-col gap-8` column (C4 does the migration) —
 * eight full-width boards down one column meant a page of scrolling for what fits in half the
 * height side by side, and the charts were far wider than their data needed.
 *
 * A panel that genuinely needs the full width says so with `span={2}` on itself, which lands as
 * `data-span="2"` on its own card; `dashboard-grid`'s CSS block reads that attribute rather than
 * this component inspecting or cloning its children — so a panel type can declare its own span
 * from YAML without the grid knowing anything about panel types at all.
 *
 * Everything else is `theme.css`'s `dashboard-grid` block. There is no responsive JS here: the
 * breakpoint is a real `@media` query, so it follows the actual viewport (and, in Storybook, the
 * preview iframe's own width) rather than a measured container prop.
 */
export function DashboardGrid({ children, className }: DashboardGridProps) {
  return <div className={cn('dashboard-grid', className)}>{children}</div>;
}
