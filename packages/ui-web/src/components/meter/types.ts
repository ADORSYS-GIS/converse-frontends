export interface MeterProps {
  /** Amount consumed. */
  value: number;
  /** The ceiling the value is measured against. */
  ceiling: number;
  /** Fraction (0–1) at and past which the fill turns `--signal`. Defaults to 0.9. */
  threshold?: number;
  /** Renders the paired "$X of $Y" mono caption below the track. Defaults to true. */
  showCaption?: boolean;
  /** Accessible name for the meter, e.g. "Budget consumption". Defaults to "Consumption". */
  label?: string;
  className?: string;
}
