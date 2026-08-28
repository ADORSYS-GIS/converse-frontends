import type { ReactNode } from 'react';

export interface InlineStatusProps {
  /** The status line content — compose tone-coloured spans, or a plain sentence. */
  children: ReactNode;
  /** Trailing inline action, e.g. a `Reset filters` or `Retry` ghost Button. */
  action?: ReactNode;
  className?: string;
}

/**
 * The outcome of pressing an action that names a capability that was never built — `+ New
 * project`, `Generate report`, and any future placeholder in the same shape. This is
 * deliberately **not** an error: nothing failed, and there is nothing to retry, so it is rendered
 * through `InlineStatus` (`role="status"`, no signal colour) rather than `ErrorLine`
 * (`role="alert"`, `Retry`) — console-ui skill "States", console-ui#325. `onDismiss` clears the
 * notice; it is never a `Retry` because retrying would reproduce the identical non-outcome.
 */
export interface PlaceholderNotice {
  /** Explains, in plain language, why the action did nothing. */
  message: string;
  /** Clears the notice. Omitted when the caller has nothing to dismiss. */
  onDismiss?: () => void;
}
