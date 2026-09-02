import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CallbackPage, FRESH_FOR_MS } from './callback-page';
import { CALLBACK_COPY, CLOSE_HINT, STALE_HINT } from './callback-copy';

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

  it('never closes the tab, however long it is open', () => {
    // The behaviour this file exists to pin. A tab reached by a redirect cannot be closed by
    // script anyway, so the old attempt was refused every time -- but the reason it is gone is
    // that dismissing someone's tab is not ours to do.
    const close = vi.spyOn(window, 'close').mockImplementation(() => {});
    render(<CallbackPage status="success" />);

    act(() => {
      vi.advanceTimersByTime(FRESH_FOR_MS * 4);
    });

    expect(close).not.toHaveBeenCalled();
    close.mockRestore();
  });

  it('offers the manual hint immediately, with nothing pending', () => {
    render(<CallbackPage status="success" />);
    expect(screen.getByText(CLOSE_HINT)).not.toBeNull();
    expect(screen.queryByText(STALE_HINT)).toBeNull();
  });

  it.each(['success', 'error'] as const)(
    'stops claiming to be current after five minutes (%s)',
    (status) => {
      render(<CallbackPage status={status} />);
      expect(screen.getByText(CLOSE_HINT)).not.toBeNull();

      act(() => {
        vi.advanceTimersByTime(FRESH_FOR_MS);
      });

      expect(screen.getByText(STALE_HINT)).not.toBeNull();
      expect(screen.queryByText(CLOSE_HINT)).toBeNull();
    }
  );

  it('is still current one tick before the five minutes elapse', () => {
    render(<CallbackPage status="success" />);

    act(() => {
      vi.advanceTimersByTime(FRESH_FOR_MS - 1);
    });

    expect(screen.getByText(CLOSE_HINT)).not.toBeNull();
    expect(screen.queryByText(STALE_HINT)).toBeNull();
  });

  it('keeps stating the outcome after it goes stale', () => {
    // Staleness changes the hint and NOTHING else -- the heading and the statement are the
    // answer the developer came here for and must survive.
    render(<CallbackPage status="success" />);

    act(() => {
      vi.advanceTimersByTime(FRESH_FOR_MS);
    });

    expect(screen.getByRole('heading').textContent).toBe(CALLBACK_COPY.success.heading);
    expect(screen.getByText(CALLBACK_COPY.success.detail)).not.toBeNull();
  });
});
