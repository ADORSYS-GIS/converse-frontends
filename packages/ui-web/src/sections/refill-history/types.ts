export interface RefillHistoryRow {
  id: string;
  submittedAgo: string;
  /** Major units — converted once, by the container, from the wire's integer-micros string. */
  amount: number;
  /** Sentence case — "Pending review" / "Approved" / "Auto-approved" / "Declined". */
  statusLabel: string;
}

export interface RefillHistoryReady {
  status: 'ready';
  rows: RefillHistoryRow[];
}

export interface RefillHistoryLoading {
  status: 'loading';
}

export interface RefillHistoryError {
  status: 'error';
  errorMessage?: string;
  onRetry?: () => void;
}

/** A non-home scoped account — `listMyAugmentationRequests` answers for the caller's home
 *  account only, the same structural gap `RefillRequestForm`'s `unavailable` branch documents. */
export interface RefillHistoryUnavailable {
  status: 'unavailable';
  caption: string;
}

export type RefillHistoryState =
  | RefillHistoryReady
  | RefillHistoryLoading
  | RefillHistoryError
  | RefillHistoryUnavailable;

export interface RefillHistoryProps {
  state: RefillHistoryState;
  className?: string;
}
