import React, { useRef, useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { usePanelHotkey } from './use-panel-hotkey';

function Panel({ name, onTrigger }: { name: string; onTrigger: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  usePanelHotkey('v', ref, onTrigger);
  return (
    // Test fixture: a focusable non-interactive container is precisely the subject under test
    // (`usePanelHotkey` arms only while focus is inside its ref'd panel). Real panels get the
    // tabIndex from a Base UI primitive that also supplies a role; this fixture must not.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
    <div ref={ref} tabIndex={0} data-testid={name}>
      <button type="button">{name} button</button>
      <input aria-label={`${name} filter`} />
      {/* `data-testid`, not `aria-label`: a bare `contenteditable` div has no role, and ARIA
          prohibits naming a role-less element (axe `aria-prohibited-attr`, serious). The point of
          this fixture is precisely a contenteditable region WITHOUT `role="textbox"` — the sibling
          below is the role-bearing case — so giving it a role to justify the label would delete
          the distinction the two cases exist to draw. */}
      <div contentEditable data-testid={`${name}-notes`} suppressContentEditableWarning />
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
    // The contenteditable case is found by test id rather than by label: naming a role-less
    // element is prohibited ARIA (see the fixture's own note), and that case is not allowed to
    // grow a role without becoming the third case instead of the second.
    ['an input', () => screen.getByLabelText('a filter')],
    ['a contenteditable region', () => screen.getByTestId('a-notes')],
    ['a role=textbox element', () => screen.getByLabelText('a combobox')],
  ])('refuses to fire while text is being entered into %s', (_label, locate) => {
    const onTrigger = vi.fn();
    render(<Panel name="a" onTrigger={onTrigger} />);
    (locate() as HTMLElement).focus();
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
        // Same fixture shape, same reason as `Panel` above.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
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
