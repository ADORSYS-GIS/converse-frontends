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

  // ── What Base UI's own `button` element brought that the bare forwardRef did not ──────────────
  //
  // The paint above was already right; the ELEMENT was ours, so the library's most-used component
  // delegated no behaviour at all. These four pin the difference. They are not decoration: each
  // one fails against a plain <button> spread with the same props.

  it('composes through `render`, keeping the daisy paint on the substituted element', () => {
    render(
      <Button
        variant="secondary"
        size="sm"
        nativeButton={false}
        render={
          // The template/clone split this very test asserts — see `component.tsx`'s note.
          // eslint-disable-next-line jsx-a11y/anchor-has-content, jsx-a11y/control-has-associated-label
          <a href="/keys" />
        }>
        Manage keys
      </Button>
    );

    // A link that behaves like a button: Base UI supplies role="button" and the Space activation
    // an <a> does not have, while `btn`/`btn-secondary`/`btn-sm` still paint it. Before this,
    // composition only worked in the other direction (Menu.Trigger render={<Button />}).
    const link = screen.getByRole('button', { name: 'Manage keys' });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/keys');
    expect(link).toHaveClass('btn', 'btn-secondary', 'btn-sm');
  });

  it('keeps a disabled button in the tab order when asked (focusableWhenDisabled)', () => {
    const handleClick = vi.fn();
    render(
      <Button disabled focusableWhenDisabled onClick={handleClick}>
        Confirm
      </Button>
    );

    // A natively disabled button is skipped by Tab, so a keyboard user never learns a dialog
    // footer's greyed-out confirm exists. Base UI swaps the attribute for aria-disabled and keeps
    // the stop; the click stays suppressed either way.
    const button = screen.getByRole('button', { name: 'Confirm' });
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');

    button.focus();
    expect(button).toHaveFocus();

    button.click();
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('suppresses the click in the handler, not only through the attribute', () => {
    const handleClick = vi.fn();
    render(
      <Button disabled nativeButton={false} render={<span />} onClick={handleClick}>
        Confirm
      </Button>
    );

    // The disabled ATTRIBUTE stops meaning anything the moment the element is not a real <button>
    // -- exactly the case the `render` prop opens up. Base UI guards the handler as well.
    screen.getByText('Confirm').click();
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('exposes the disabled state as a data attribute for CSS to key off', () => {
    render(<Button disabled>Continue</Button>);

    // theme.css keys the console's disabled treatment off :disabled today, so nothing depends on
    // this yet -- but a `render`ed non-button has no :disabled to match, and this is what such a
    // rule would use. Asserted so the swap is a fact rather than a claim.
    expect(screen.getByRole('button', { name: 'Continue' })).toHaveAttribute('data-disabled');
  });
});
