import type { ReactNode } from 'react';

export interface StatCardDelta {
  direction: 'up' | 'down' | 'flat';
  /** e.g. "18% vs prev 30d", "no change", "8% vs yesterday". */
  label: string;
}

export interface StatCardProps {
  /** 12px line-glyph slot, rendered above the label. Never tinted. */
  icon?: ReactNode;
  label: string;
  /** Pre-formatted numeral, e.g. "$142.55", "23", "41,208". */
  metric: string;
  /** Deltas are never green/red — direction is carried by the glyph and wording alone. */
  delta?: StatCardDelta;
  /** Right-hand slot — typically a `<Sparkline />`. */
  sparkline?: ReactNode;
  className?: string;
}
