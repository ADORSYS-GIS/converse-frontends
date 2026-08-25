import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useHoverActive } from './use-hover-active';

function Harness({ onActiveChange }: { onActiveChange?: (active: string | null) => void }) {
  const { active, getHoverProps } = useHoverActive<string>();
  onActiveChange?.(active);

  return (
    <div>
      <span data-testid="active">{active ?? 'none'}</span>
      <button type="button" {...getHoverProps('a')}>
        a
      </button>
      <button type="button" {...getHoverProps('b')}>
        b
      </button>
    </div>
  );
}

describe('useHoverActive', () => {
  it('starts with nothing active', () => {
    render(<Harness />);

    expect(screen.getByTestId('active')).toHaveTextContent('none');
  });

  it('activates a value on a fine pointer entering its hit-region', () => {
    render(<Harness />);

    fireEvent.pointerEnter(screen.getByRole('button', { name: 'a' }), { pointerType: 'mouse' });

    expect(screen.getByTestId('active')).toHaveTextContent('a');
  });

  it('clears the active value when a fine pointer leaves', () => {
    render(<Harness />);

    fireEvent.pointerEnter(screen.getByRole('button', { name: 'a' }), { pointerType: 'mouse' });
    expect(screen.getByTestId('active')).toHaveTextContent('a');

    fireEvent.pointerLeave(screen.getByRole('button', { name: 'a' }), { pointerType: 'mouse' });
    expect(screen.getByTestId('active')).toHaveTextContent('none');
  });

  it('switches directly to the newly-entered value without an intermediate stale clear', () => {
    render(<Harness />);

    fireEvent.pointerEnter(screen.getByRole('button', { name: 'a' }), { pointerType: 'mouse' });
    fireEvent.pointerLeave(screen.getByRole('button', { name: 'a' }), { pointerType: 'mouse' });
    fireEvent.pointerEnter(screen.getByRole('button', { name: 'b' }), { pointerType: 'mouse' });

    expect(screen.getByTestId('active')).toHaveTextContent('b');
  });

  it('a touch pointer activates on contact and stays active on pointerleave (tap, not flash)', () => {
    render(<Harness />);

    fireEvent.pointerEnter(screen.getByRole('button', { name: 'a' }), { pointerType: 'touch' });
    fireEvent.pointerLeave(screen.getByRole('button', { name: 'a' }), { pointerType: 'touch' });

    expect(screen.getByTestId('active')).toHaveTextContent('a');
  });

  it('a touch tap on a different region still replaces the active value', () => {
    render(<Harness />);

    fireEvent.pointerEnter(screen.getByRole('button', { name: 'a' }), { pointerType: 'touch' });
    fireEvent.pointerEnter(screen.getByRole('button', { name: 'b' }), { pointerType: 'touch' });

    expect(screen.getByTestId('active')).toHaveTextContent('b');
  });

  it('activates on keyboard focus and clears on blur', () => {
    render(<Harness />);

    fireEvent.focus(screen.getByRole('button', { name: 'a' }));
    expect(screen.getByTestId('active')).toHaveTextContent('a');

    fireEvent.blur(screen.getByRole('button', { name: 'a' }));
    expect(screen.getByTestId('active')).toHaveTextContent('none');
  });

  it('a stale leave/blur for a value that is no longer active does not clobber the new one', () => {
    render(<Harness />);

    const a = screen.getByRole('button', { name: 'a' });
    const b = screen.getByRole('button', { name: 'b' });

    fireEvent.pointerEnter(a, { pointerType: 'mouse' });
    fireEvent.pointerEnter(b, { pointerType: 'mouse' });
    // A late/out-of-order leave for `a` must not clear `b`, which is now active.
    fireEvent.pointerLeave(a, { pointerType: 'mouse' });

    expect(screen.getByTestId('active')).toHaveTextContent('b');
  });
});
