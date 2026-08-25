import type { StatCardDelta } from '../../components/stat-card';

/**
 * 12px line-glyph slot key for a stat card — the section resolves these to the actual glyph
 * (structural, not decorative, per console-ui skill) so `fixtures.ts` stays plain data.
 */
export type OverviewStatCardIcon = 'spend' | 'projects' | 'keys' | 'requests';

export interface OverviewStatCardData {
  key: string;
  icon?: OverviewStatCardIcon;
  label: string;
  /** Pre-formatted numeral, e.g. "$142.55", "6", "41,208". */
  metric: string;
  delta?: StatCardDelta;
  /** Oldest-first sparkline series, rendered via `Sparkline`. */
  sparklineData: number[];
}

export interface OverviewStatRowProps {
  cards: OverviewStatCardData[];
  /** Replaces every card with a skeleton of the same geometry (console-ui skill §states). */
  loading?: boolean;
  className?: string;
}
