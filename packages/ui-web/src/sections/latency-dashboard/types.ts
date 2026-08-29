import type { ReactNode } from 'react';

import type { LatencyRidgelineSeries } from '../../components/latency-ridgeline';
import type { DashboardStatus } from '../spend-dashboard/types';

export interface LatencyDashboardProps {
  /** Uppercase tracked heading. Defaults to overview.svg's own wording. */
  label?: string;
  series: LatencyRidgelineSeries[];
  /** Fallback width before the container is measured — see `SpendDashboardProps.fallbackWidth`. */
  fallbackWidth: number;
  height: number;
  status?: DashboardStatus;
  errorMessage?: string;
  /** Overrides `UNWIRED_CHART_MESSAGE` for `status="unwired"` — see `DashboardStatus`'s docstring. */
  unwiredMessage?: string;
  onRetry?: () => void;
  onSelectSeries?: (key: string | null) => void;
  formatXTick?: (value: number) => string;
  /**
   * A small muted line rendered below the chart. Exists so the panel can be honest about WHICH
   * series lack latency (an aggregate-metric model, a range with no traffic for one model) rather
   * than either fabricating a shape for them or blanking the whole panel over a partial gap —
   * per-series honesty, not all-or-nothing. Rendered regardless of `status` when provided; the
   * caller decides whether the current state warrants one (`use-overview-screen.ts`'s
   * `latencyFootnote`).
   */
  footnote?: ReactNode;
  /** Compact-tier trigger slot on the heading row. */
  actions?: ReactNode;
  className?: string;
}
