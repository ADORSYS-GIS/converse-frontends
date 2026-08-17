import React from 'react';

export type ErrorBoundaryFallbackProps = {
  error: Error;
  onRetry: () => void;
};

type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallback: (props: ErrorBoundaryFallbackProps) => React.ReactNode;
  onError?: (error: Error, componentStack: string | null) => void;
};

type ErrorBoundaryState = {
  error: Error | null;
};

/**
 * A render-time error boundary. React only exposes `componentDidCatch` /
 * `getDerivedStateFromError` on class components -- there is no hook
 * equivalent -- so this stays a class despite the rest of the app being
 * function-component-only.
 *
 * Always logs the caught error and component stack to the console *before*
 * rendering the fallback. This is a deliberate, load-bearing choice, not an
 * incidental log line: the incident that motivated this component (see
 * lightbridge issue #180 -- a `TypeError` inside `OneTimeSecretCard`'s
 * `useMemo` blanked the entire app) was only diagnosable because the crash
 * reached the console with a clean stack trace. A boundary that swallows the
 * error would hide the next one just as effectively as no boundary at all.
 * `onError` is an additional hook for callers that want to also assert on
 * what was reported (tests) or forward it to telemetry -- it is never a
 * substitute for the console.error below.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const componentStack = errorInfo.componentStack ?? null;
    console.error('[ErrorBoundary] Caught a render error:', error, componentStack);
    this.props.onError?.(error, componentStack);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (error) {
      return this.props.fallback({ error, onRetry: this.reset });
    }
    return this.props.children;
  }
}
