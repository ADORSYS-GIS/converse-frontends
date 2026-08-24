import type { ReactNode } from 'react';

export interface ErrorLineProps {
  message: ReactNode;
  /** Present only when the failure is retryable. */
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}
