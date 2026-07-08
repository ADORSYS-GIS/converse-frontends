import type { ReactNode } from 'react';
import type { ViewProps } from 'react-native';

import type { PaginationVariantProps } from './cva';

export type PaginationProps = ViewProps &
  PaginationVariantProps & {
    /** 1-based current page number. */
    page: number;
    /** Whether the Previous control is enabled. */
    canPrev: boolean;
    /** Whether the Next control is enabled (a heuristic when the backend gives no total). */
    hasMore: boolean;
    onPrev: () => void;
    onNext: () => void;
    /** Word before the page number, e.g. "Page". The app passes the i18n string. */
    pageLabel?: string;
    previousLabel?: string;
    nextLabel?: string;
    /** Icon slot rendered before the Previous label (keeps the DS icon-library-agnostic). */
    prevIcon?: ReactNode;
    /** Icon slot rendered after the Next label. */
    nextIcon?: ReactNode;
  };
