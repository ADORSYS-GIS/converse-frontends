import type { ReactNode } from 'react';
import type { ViewProps } from 'react-native';

import type { StatCardTrendVariantProps, StatCardVariantProps } from './cva';

export type StatCardTrend = StatCardTrendVariantProps & {
  /** Pre-formatted delta text, e.g. "+12% vs last week". The app owns i18n/number formatting. */
  label: string;
};

export type StatCardProps = ViewProps &
  StatCardVariantProps & {
    label: string;
    /** The headline number. Pre-formatted by the caller (locale, currency, units). */
    value: ReactNode;
    /** Optional icon slot, rendered opposite the label. */
    icon?: ReactNode;
    trend?: StatCardTrend;
    /** Small caption under the value/trend row, e.g. "Last 30 days". */
    description?: string;
  };
