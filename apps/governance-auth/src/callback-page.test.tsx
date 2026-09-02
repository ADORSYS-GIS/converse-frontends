import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CallbackPage, CLOSE_ATTEMPT_DELAY_MS } from './callback-page';
import { CALLBACK_COPY, CLOSE_PENDING_HINT, CLOSE_REFUSED_HINT } from './callback-copy';

// Plain `toBeNull()`/`textContent` assertions, not `@testing-library/jest-dom` matchers:
// `apps/authz-ui` runs its jsdom project with no setup file, and neither does this one. A
// `toBeInTheDocument()` here would throw "is not a function" rather than assert anything.
describe('CallbackPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('states the outcome as the heading when signed in', () => {
    // Arrange / Act
    render(<CallbackPage status="success" />);

    // Assert
    expect(screen.getByRole('heading', { name: CALLBACK_COPY.success.heading })).not.toBeNull();
    expect(screen.queryByText(CALLBACK_COPY.error.heading)).toBeNull();
  });

  it('states the outcome as the heading when sign-in failed', () => {
    render(<CallbackPage status="error" />);

    expect(screen.getByRole('heading', { name: CALLBACK_COPY.error.heading })).not.toBeNull();
    expect(screen.queryByText(CALLBACK_COPY.success.heading)).toBeNull();
  });

  // Accessibility: the outcome must reach a screen reader, and colour must not be what carries
  // it. `role="status"` (polite) for success, `role="alert"` (assertive) for failure — and the
  // heading above each already says the same thing in words.
  it('announces the success statement politely and raises no alert', () => {
    render(<CallbackPage status="success" />);

    const statuses = screen.getAllByRole('status');
    // The statement, then the close hint.
    expect(statuses).toHaveLength(2);
    expect(statuses[0]?.textContent).toBe(CALLBACK_COPY.success.detail);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('announces the failure statement assertively', () => {
    render(<CallbackPage status="error" />);

    expect(screen.getByRole('alert').textContent).toBe(CALLBACK_COPY.error.detail);
    // The close hint only — the failure statement is the alert, not a second status line.
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  it('never promises a close it has not attempted', () => {
    render(<CallbackPage status="success" />);

    expect(screen.getByText(CLOSE_PENDING_HINT)).not.toBeNull();
    expect(screen.queryByText(CLOSE_REFUSED_HINT)).toBeNull();
  });

  it.each(['success', 'error'] as const)(
    'attempts window.close() and then degrades to the manual hint (%s)',
    (status) => {
      // Arrange
      const close = vi.spyOn(window, 'close').mockImplementation(() => undefined);
      render(<CallbackPage status={status} />);

      // Act
      act(() => {
        vi.advanceTimersByTime(CLOSE_ATTEMPT_DELAY_MS);
      });

      // Assert
      expect(close).toHaveBeenCalled();
      expect(screen.getByText(CLOSE_REFUSED_HINT)).not.toBeNull();
      expect(screen.queryByText(CLOSE_PENDING_HINT)).toBeNull();
    }
  );

  it('still degrades to the manual hint when window.close() throws', () => {
    // Arrange — a browser that refuses by throwing rather than by ignoring the call.
    vi.spyOn(window, 'close').mockImplementation(() => {
      throw new Error('Scripts may close only the windows that were opened by them.');
    });
    render(<CallbackPage status="success" />);

    // Act
    act(() => {
      vi.advanceTimersByTime(CLOSE_ATTEMPT_DELAY_MS);
    });

    // Assert
    expect(screen.getByText(CLOSE_REFUSED_HINT)).not.toBeNull();
  });

  it('does not attempt the close before the delay has elapsed', () => {
    const close = vi.spyOn(window, 'close').mockImplementation(() => undefined);
    render(<CallbackPage status="success" />);

    act(() => {
      vi.advanceTimersByTime(CLOSE_ATTEMPT_DELAY_MS - 1);
    });

    expect(close).not.toHaveBeenCalled();
  });
});
