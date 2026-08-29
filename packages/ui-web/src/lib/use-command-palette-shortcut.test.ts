import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useCommandPaletteShortcut } from './use-command-palette-shortcut';

function pressKey(key: string, modifiers: { metaKey?: boolean; ctrlKey?: boolean } = {}) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...modifiers,
  });
  document.dispatchEvent(event);
  return event;
}

describe('useCommandPaletteShortcut', () => {
  it('toggles open on Cmd+K', () => {
    const setOpen = vi.fn();
    renderHook(() => useCommandPaletteShortcut(setOpen));

    pressKey('k', { metaKey: true });

    expect(setOpen).toHaveBeenCalledTimes(1);
    const updater = setOpen.mock.calls[0][0] as (open: boolean) => boolean;
    expect(updater(false)).toBe(true);
    expect(updater(true)).toBe(false);
  });

  it('toggles open on Ctrl+K', () => {
    const setOpen = vi.fn();
    renderHook(() => useCommandPaletteShortcut(setOpen));

    pressKey('k', { ctrlKey: true });

    expect(setOpen).toHaveBeenCalledTimes(1);
  });

  it('is case-insensitive on the key', () => {
    const setOpen = vi.fn();
    renderHook(() => useCommandPaletteShortcut(setOpen));

    pressKey('K', { metaKey: true });

    expect(setOpen).toHaveBeenCalledTimes(1);
  });

  it('prevents the default browser action (e.g. the Chrome bookmark bar shortcut)', () => {
    const setOpen = vi.fn();
    renderHook(() => useCommandPaletteShortcut(setOpen));

    const event = pressKey('k', { metaKey: true });

    expect(event.defaultPrevented).toBe(true);
  });

  it('ignores k without a modifier key', () => {
    const setOpen = vi.fn();
    renderHook(() => useCommandPaletteShortcut(setOpen));

    pressKey('k');

    expect(setOpen).not.toHaveBeenCalled();
  });

  it('ignores other keys, even with a modifier', () => {
    const setOpen = vi.fn();
    renderHook(() => useCommandPaletteShortcut(setOpen));

    pressKey('j', { metaKey: true });

    expect(setOpen).not.toHaveBeenCalled();
  });

  it('removes the listener on unmount', () => {
    const setOpen = vi.fn();
    const { unmount } = renderHook(() => useCommandPaletteShortcut(setOpen));

    unmount();
    pressKey('k', { metaKey: true });

    expect(setOpen).not.toHaveBeenCalled();
  });
});
