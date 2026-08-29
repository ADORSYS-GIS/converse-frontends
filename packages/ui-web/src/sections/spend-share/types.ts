import type { ShareBarSegment } from '../../components/share-bar';

/** Per-section load status -- this dashboard failing must never take its neighbours down (same contract as `spend-dashboard`'s `DashboardStatus`, kept as its own type so the two sections stay parallel-PR-friendly). */
export type SpendShareStatus = 'ready' | 'loading' | 'error';

export interface SpendShareSectionProps {
  /** Section heading. Defaults to the section's own wording. */
  label?: string;
  segments: ShareBarSegment[];
  /** Total across every segment, pre-formatted (e.g. `$1.36`). Rendered as the zone's one numeral. */
  total?: string;
  status?: SpendShareStatus;
  errorMessage?: string;
  onRetry?: () => void;
  /** Controlled selection -- pass the page's `selectedSeriesKey` so this stays in sync with the SPEND time-series chart. */
  selectedKey?: string | null;
  onSelectSegment?: (key: string | null) => void;
  formatPercent?: (percent: number) => string;
  className?: string;
}
