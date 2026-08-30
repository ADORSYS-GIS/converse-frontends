import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RailResizer } from './component';

function props(
  overrides: Partial<React.ComponentProps<typeof RailResizer>> = {}
): React.ComponentProps<typeof RailResizer> {
  return {
    value: 280,
    onChange: vi.fn(),
    min: 240,
    max: 480,
    ...overrides,
  };
}

describe('RailResizer', () => {
  it('renders the WAI-ARIA window-splitter shape', () => {
    render(<RailResizer {...props()} />);

    const separator = screen.getByRole('separator');
    expect(separator).toHaveAttribute('aria-orientation', 'vertical');
    expect(separator).toHaveAttribute('aria-valuenow', '280');
    expect(separator).toHaveAttribute('aria-valuemin', '240');
    expect(separator).toHaveAttribute('aria-valuemax', '480');
    expect(separator).toHaveAttribute('tabIndex', '0');
  });

  it('widens the rail on ArrowLeft — the rail sits on the trailing edge', () => {
    const onChange = vi.fn();
    render(<RailResizer {...props({ value: 280, onChange })} />);

    fireEvent.keyDown(screen.getByRole('separator'), { key: 'ArrowLeft' });

    expect(onChange).toHaveBeenCalledWith(296);
  });

  it('narrows the rail on ArrowRight', () => {
    const onChange = vi.fn();
    render(<RailResizer {...props({ value: 280, onChange })} />);

    fireEvent.keyDown(screen.getByRole('separator'), { key: 'ArrowRight' });

    expect(onChange).toHaveBeenCalledWith(264);
  });

  it('clamps ArrowLeft at the max bound', () => {
    const onChange = vi.fn();
    render(<RailResizer {...props({ value: 475, min: 240, max: 480, onChange })} />);

    fireEvent.keyDown(screen.getByRole('separator'), { key: 'ArrowLeft' });

    expect(onChange).toHaveBeenCalledWith(480);
  });

  it('clamps ArrowRight at the min bound', () => {
    const onChange = vi.fn();
    render(<RailResizer {...props({ value: 245, min: 240, max: 480, onChange })} />);

    fireEvent.keyDown(screen.getByRole('separator'), { key: 'ArrowRight' });

    expect(onChange).toHaveBeenCalledWith(240);
  });

  it('jumps to the min bound on Home and the max bound on End', () => {
    const onChange = vi.fn();
    render(<RailResizer {...props({ value: 320, min: 240, max: 480, onChange })} />);

    fireEvent.keyDown(screen.getByRole('separator'), { key: 'Home' });
    expect(onChange).toHaveBeenCalledWith(240);

    fireEvent.keyDown(screen.getByRole('separator'), { key: 'End' });
    expect(onChange).toHaveBeenCalledWith(480);
  });

  it('ignores keys outside its own vocabulary', () => {
    const onChange = vi.fn();
    render(<RailResizer {...props({ onChange })} />);

    fireEvent.keyDown(screen.getByRole('separator'), { key: 'Tab' });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('drags the boundary via pointer events, widening on a leftward move', () => {
    const onChange = vi.fn();
    render(<RailResizer {...props({ value: 280, onChange })} />);

    const separator = screen.getByRole('separator');
    fireEvent.pointerDown(separator, { clientX: 500, button: 0 });
    fireEvent.pointerMove(document, { clientX: 460 });

    // 500 -> 460 is a 40px leftward move; the rail is on the trailing edge, so that widens it.
    expect(onChange).toHaveBeenCalledWith(320);

    fireEvent.pointerUp(document);
    onChange.mockClear();
    fireEvent.pointerMove(document, { clientX: 400 });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('clamps a drag past the bounds', () => {
    const onChange = vi.fn();
    render(<RailResizer {...props({ value: 280, min: 240, max: 480, onChange })} />);

    const separator = screen.getByRole('separator');
    fireEvent.pointerDown(separator, { clientX: 500, button: 0 });
    fireEvent.pointerMove(document, { clientX: -1000 });

    expect(onChange).toHaveBeenCalledWith(480);
  });
});
