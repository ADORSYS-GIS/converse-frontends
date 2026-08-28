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
  /** Compact-tier trigger slot on the heading row. */
  actions?: ReactNode;
  className?: string;
}
