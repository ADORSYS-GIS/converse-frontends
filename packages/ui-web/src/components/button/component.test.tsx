import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from './component';

describe('Button', () => {
  it('renders its children', () => {
    render(<Button>Continue</Button>);

    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
  });

  it('applies the primary variant classes by default', () => {
    render(<Button>Continue</Button>);

    const button = screen.getByRole('button', { name: 'Continue' });
    expect(button).toHaveClass('btn');
    // `btn-primary` sets `--btn-color`/`--btn-fg` to `--color-primary`/`--color-primary-content`
    // via the theme (ADR 0010 Decision 4) -- the AA-corrected text-on-accent pairing (Decision
    // 3b: `text-ink` on `bg-primary` is 3.26:1, below AA; `primary-content` stays AA+) comes from
    // `theme.css`, not a class this component writes.
    expect(button).toHaveClass('btn-primary');
  });

  it('applies the secondary variant classes', () => {
    render(<Button variant="secondary">Continue</Button>);

    const button = screen.getByRole('button', { name: 'Continue' });
    // Transparent fill, `--line` border, `--body` text -- re-pointed onto daisy's own button
    // variables in `theme.css`, because daisy's stock secondary fills with `--color-secondary` and
    // its outline variant borrows `base-content` rather than our line token. The variant is a
    // class name here, never a stack of overrides.
    expect(button).toHaveClass('btn-secondary');
    expect(button).not.toHaveClass('btn-primary');
  });

  it('applies the ghost variant classes', () => {
    render(<Button variant="ghost">Continue</Button>);

    const button = screen.getByRole('button', { name: 'Continue' });
    expect(button).toHaveClass('btn-ghost');
    expect(button).not.toHaveClass('btn-primary');
  });

  it('renders as disabled and does not fire the click handler', async () => {
    const handleClick = vi.fn();
    render(
      <Button disabled onClick={handleClick}>
        Continue
      </Button>
    );

    const button = screen.getByRole('button', { name: 'Continue' });
    expect(button).toBeDisabled();

    button.click();
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('fires the click handler when enabled', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Continue</Button>);

    screen.getByRole('button', { name: 'Continue' }).click();

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  // daisy's `btn-square` takes its width AND height from `--size`, which `btn-sm` pins to the
  // console's 30px -- so 30x30 with zero inline padding is two daisy classes rather than three
  // arbitrary-value overrides. The 16px glyph pin (an inline SVG with only a `viewBox` otherwise
  // falls back to the browser's much larger replaced-element box) rides along with `btn-square`
  // in `theme.css`.
  it('applies the 30x30 icon size, keyed off an explicit aria-label since it carries no visible text', () => {
    render(
      <Button variant="ghost" size="icon" aria-label="Open filters">
        <svg aria-hidden="true" viewBox="0 0 12 12" />
      </Button>
    );

    const button = screen.getByRole('button', { name: 'Open filters' });
    expect(button).toHaveClass('btn-square');
    expect(button).toHaveClass('btn-sm');
  });
});
