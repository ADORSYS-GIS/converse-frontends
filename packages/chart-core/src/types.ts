/** One entry a chart legend or tooltip can point at -- shared shape across every primitive. */
export interface ChartSeriesMeta {
  /** Stable identity, e.g. a model id or project id -- not necessarily the display label. */
  key: string;
  /** Display label, already localized/formatted by the caller. */
  label: string;
  /** This series has breached a configured ceiling (budget/quota, latency SLO, ...). Renders in the accent. */
  breached?: boolean;
}
