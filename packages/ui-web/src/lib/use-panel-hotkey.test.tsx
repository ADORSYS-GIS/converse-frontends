import React, { useRef, useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { usePanelHotkey } from './use-panel-hotkey';

function Panel({ name, onTrigger }: { name: string; onTrigger: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  usePanelHotkey('v', ref, onTrigger);
  return (
    <div ref={ref} tabIndex={0} data-testid={name}>
      <button type="button">{name} button</button>
      <input aria-label={`${name} filter`} />
      <div contentEditable aria-label={`${name} notes`} suppressContentEditableWarning />
      <div role="textbox" tabIndex={0} aria-label={`${name} combobox`} />
    </div>
  );
}

function press(key: string, init: Partial<KeyboardEventInit> = {}) {
  fireEvent.keyDown(document, { key, ...init });
}

describe('usePanelHotkey', () => {
  it('fires when focus is inside the container', () => {
    const onTrigger = vi.fn();
    render(<Panel name="a" onTrigger={onTrigger} />);

    screen.getByTestId('a').focus();
    press('v');
    expect(onTrigger).toHaveBeenCalledTimes(1);

    screen.getByRole('button', { name: 'a button' }).focus();
    press('v');
    expect(onTrigger).toHaveBeenCalledTimes(2);
  });

  it('does not fire when focus is outside it', () => {
    const onTrigger = vi.fn();
    render(
      <>
        <button type="button">outside</button>
        <Panel name="a" onTrigger={onTrigger} />
      </>
    );
    screen.getByRole('button', { name: 'outside' }).focus();
    press('v');
    expect(onTrigger).not.toHaveBeenCalled();
  });

  /** The AC: "with two panels, only the focused one expands." A page renders eight of these and
   *  they all listen at once. */
  it('reaches exactly the focused panel when several are mounted', () => {
    const a = vi.fn();
    const b = vi.fn();
    render(
      <>
        <Panel name="a" onTrigger={a} />
        <Panel name="b" onTrigger={b} />
      </>
    );

    screen.getByTestId('b').focus();
    press('v');
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
  });

  /** The AC: "a user types `v` into a field inside a panel → nothing expands." */
  it.each([
    ['an input', 'a filter'],
    ['a contenteditable region', 'a notes'],
    ['a role=textbox element', 'a combobox'],
  ])('refuses to fire while text is being entered into %s', (_label, label) => {
    const onTrigger = vi.fn();
    render(<Panel name="a" onTrigger={onTrigger} />);
    screen.getByLabelText(label).focus();
    press('v');
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('ignores modified presses — ⌘V is paste, not zoom', () => {
    const onTrigger = vi.fn();
    render(<Panel name="a" onTrigger={onTrigger} />);
    screen.getByTestId('a').focus();
    press('v', { metaKey: true });
    press('v', { ctrlKey: true });
    press('v', { altKey: true });
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('is case-insensitive, so Shift+V works', () => {
    const onTrigger = vi.fn();
    render(<Panel name="a" onTrigger={onTrigger} />);
    screen.getByTestId('a').focus();
    press('V', { shiftKey: true });
    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it('ignores any other key', () => {
    const onTrigger = vi.fn();
    render(<Panel name="a" onTrigger={onTrigger} />);
    screen.getByTestId('a').focus();
    press('x');
    press('Enter');
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('removes its listener on unmount', () => {
    const onTrigger = vi.fn();
    const { unmount } = render(<Panel name="a" onTrigger={onTrigger} />);
    screen.getByTestId('a').focus();
    unmount();
    press('v');
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('is disarmed while `enabled` is false', () => {
    function Disarmed({ onTrigger }: { onTrigger: () => void }) {
      const ref = useRef<HTMLDivElement>(null);
      const [enabled, setEnabled] = useState(true);
      usePanelHotkey('v', ref, onTrigger, enabled);
      return (
        <div ref={ref} tabIndex={0} data-testid="d">
          <button type="button" onClick={() => setEnabled(false)}>
            disarm
          </button>
        </div>
      );
    }

    const onTrigger = vi.fn();
    render(<Disarmed onTrigger={onTrigger} />);
    fireEvent.click(screen.getByRole('button', { name: 'disarm' }));
    screen.getByTestId('d').focus();
    press('v');
    expect(onTrigger).not.toHaveBeenCalled();
  });
});
