import type { StatCardDelta } from '../../components/stat-card';

export interface OverviewStatCardData {
  key: string;
  label: string;
  /** Pre-formatted numeral, e.g. "$142.55", "6", "41,208". */
  metric: string;
  delta?: StatCardDelta;
  /**
   * Oldest-first sparkline series, rendered via `Sparkline`. Optional -- omit it entirely (not
   * `[]`) when no trend data exists for this metric, e.g. a data source that has never been
   * queried (#273). The section renders no sparkline slot at all in that case, matching
   * `BudgetPanel`'s own "omitted entirely, never an empty placeholder" contract, rather than
   * passing an empty array through to a chart primitive.
   */
  sparklineData?: number[];
}

export interface OverviewStatRowProps {
  cards: OverviewStatCardData[];
  /** Replaces every card with a skeleton of the same geometry (console-ui skill §states). */
  loading?: boolean;
  className?: string;
}
