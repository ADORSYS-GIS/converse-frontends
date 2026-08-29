export interface DateRangeValue {
  from: Date;
  to: Date;
}

export interface DateRangePreset {
  /** Stable id, e.g. `'30d'` — what the URL stores when a preset is active. */
  value: string;
  label: string;
  /** Days back from today, inclusive of today. */
  days: number;
}

export interface DateRangeFieldProps {
  label: string;
  /** The active preset id, or `null` when the range is an explicit custom span. */
  preset: string | null;
  presets: DateRangePreset[];
  /** The resolved span, whether it came from a preset or from the calendar. */
  value: DateRangeValue;
  onPresetChange: (preset: string) => void;
  onRangeChange: (range: DateRangeValue) => void;
  /** Days after this are not selectable. Defaults to today. */
  today?: Date;
  layout?: 'stacked' | 'inline';
  className?: string;
}
