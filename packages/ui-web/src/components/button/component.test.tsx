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
    expect(button.className).toContain('border-border');
    expect(button.className).toContain('text-soft');
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
      </Button>,
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

  it('applies the 30x30 icon size, keyed off an explicit aria-label since it carries no visible text', () => {
    render(
      <Button variant="ghost" size="icon" aria-label="Open filters">
        <svg aria-hidden="true" />
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Open filters' });
    expect(button.className).toContain('h-[30px]');
    expect(button.className).toContain('w-[30px]');
    expect(button.className).toContain('p-0');
  });

  it('pins icon-button glyphs to a fixed 16px regardless of the child SVG viewBox', () => {
    render(
      <Button variant="ghost" size="icon" aria-label="Open filters">
        <svg aria-hidden="true" viewBox="0 0 12 12" />
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Open filters' });
    // `[&_svg]:size-4` (16px) — the fix for glyphs that render oversized because an inline SVG
    // with only a `viewBox` and no `width`/`height` falls back to the browser's much larger
    // replaced-element default box.
    expect(button.className).toContain('[&_svg]:size-4');
  });
});
