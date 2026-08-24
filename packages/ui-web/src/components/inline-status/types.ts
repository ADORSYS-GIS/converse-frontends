import type { ReactNode } from 'react';

export interface InlineStatusProps {
  /** The status line content — compose tone-coloured spans, or a plain sentence. */
  children: ReactNode;
  /** Trailing inline action, e.g. a `Reset filters` or `Retry` ghost Button. */
  action?: ReactNode;
  className?: string;
}
