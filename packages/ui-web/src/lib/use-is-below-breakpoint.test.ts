import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useIsBelowLg, useIsBelowMd } from './use-is-below-breakpoint';

describe('useIsBelowLg', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    if (originalMatchMedia) {
      window.matchMedia = originalMatchMedia;
    } else {
      // jsdom does not implement matchMedia at all by default in this project's test env.
      // @ts-expect-error - deliberately removing the mock to restore the pre-test state.
      delete window.matchMedia;
    }
  });

  it('defaults to true (assumes below lg) when matchMedia is unavailable — jsdom does not implement it here', () => {
    expect(window.matchMedia).toBeUndefined();

    const { result } = renderHook(() => useIsBelowLg());

    expect(result.current).toBe(true);
  });

  it('reflects matchMedia(max-width: 1023px).matches when available, and updates on change', () => {
    let matches = false;
    let changeHandler: (() => void) | undefined;
    const mql = {
      matches,
      addEventListener: vi.fn((_event: string, handler: () => void) => {
        changeHandler = handler;
      }),
      removeEventListener: vi.fn(),
    };
    window.matchMedia = vi.fn().mockImplementation(() => mql);

    const { result } = renderHook(() => useIsBelowLg());
    expect(result.current).toBe(false);

    matches = true;
    mql.matches = true;
    act(() => {
      changeHandler?.();
    });

    expect(result.current).toBe(true);
  });

  it('unsubscribes from matchMedia on unmount', () => {
    const removeEventListener = vi.fn();
    const mql = { matches: false, addEventListener: vi.fn(), removeEventListener };
    window.matchMedia = vi.fn().mockImplementation(() => mql);

    const { unmount } = renderHook(() => useIsBelowLg());
    unmount();

    expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('also re-checks matches on a plain window resize — a belt-and-suspenders fallback for engines/automation contexts where a CDP-driven viewport override updates matchMedia().matches without dispatching its own change event (confirmed empirically against SectionSheet in a live browser)', () => {
    let matches = false;
    const mql = {
      get matches() {
        return matches;
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    window.matchMedia = vi.fn().mockImplementation(() => mql);

    const { result } = renderHook(() => useIsBelowLg());
    expect(result.current).toBe(false);

    matches = true;
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current).toBe(true);
  });

  it('unsubscribes from window resize on unmount', () => {
    const mql = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
    window.matchMedia = vi.fn().mockImplementation(() => mql);
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useIsBelowLg());
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    removeEventListenerSpy.mockRestore();
  });
});

describe('useIsBelowMd', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    if (originalMatchMedia) {
      window.matchMedia = originalMatchMedia;
    } else {
      // @ts-expect-error - deliberately removing the mock to restore the pre-test state.
      delete window.matchMedia;
    }
  });

  it('queries the md (600) boundary, not the lg one — it gates ConsoleShell’s left-secondary drawer', () => {
    const mql = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
    const matchMedia = vi.fn().mockImplementation(() => mql);
    window.matchMedia = matchMedia;

    renderHook(() => useIsBelowMd());

    expect(matchMedia).toHaveBeenCalledWith('(max-width: 599px)');
  });

  it('defaults to true when matchMedia is unavailable, like its lg sibling', () => {
    expect(window.matchMedia).toBeUndefined();

    const { result } = renderHook(() => useIsBelowMd());

    expect(result.current).toBe(true);
  });
});
