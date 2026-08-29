import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SecretReveal } from './component';

const secret = 'sk-lb-Xq7T4mA9vR2nK8sE1wYb6tZ0pL5cJ3dF';

describe('SecretReveal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('renders the secret read-only', () => {
    render(
      <SecretReveal
        heading="New key created — shown once"
        description="Copy it now."
        secret={secret}
        onDismiss={() => {}}
      />
    );

    const input = screen.getByLabelText('Secret value') as HTMLInputElement;
    expect(input.value).toBe(secret);
    expect(input).toHaveAttribute('readonly');
  });

  // What Base UI's `input` brought: the control is Field.Control, so every Field.Description in
  // the strip registers its id and the control announces it. Before this the caption was a loose
  // paragraph beside the control -- a screen-reader user landing on the secret heard "Secret
  // value, read only" and never heard the sentence that makes the strip urgent.
  it('associates the shown-once caption with the secret rather than leaving it to proximity', () => {
    render(
      <SecretReveal
        heading="New key created — shown once"
        description="This value cannot be retrieved again."
        secret={secret}
        onDismiss={() => {}}
      />
    );

    const input = screen.getByLabelText('Secret value');
    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();

    const caption = document.getElementById(describedBy as string);
    expect(caption).toHaveTextContent('This value cannot be retrieved again.');
    // The name stays the terse label: promoting the heading to a Field.Label would announce the
    // control as "New key created — shown once", which names the event, not the control.
    expect(input).toHaveAttribute('aria-label', 'Secret value');
  });

  it('copies the secret to the clipboard and shows a confirmation', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });

    render(
      <SecretReveal
        heading="New key created — shown once"
        description="Copy it now."
        secret={secret}
        onDismiss={() => {}}
      />
    );

    await act(async () => {
      screen.getByRole('button', { name: 'Copy' }).click();
    });

    expect(writeText).toHaveBeenCalledWith(secret);
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });

  // PRIMITIVE-MATRIX row 26: daisy owns the paint on all three controls — `input` on the secret
  // strip (via the shared `fieldControlClassName`), `btn btn-primary` on Copy and `btn btn-ghost`
  // on the dismissal — and nothing here re-declares them by hand.
  it('wears the daisy control classes rather than a hand-written treatment', () => {
    render(
      <SecretReveal
        heading="New key created — shown once"
        description="Copy it now."
        secret={secret}
        onDismiss={() => {}}
      />
    );

    expect(screen.getByLabelText('Secret value')).toHaveClass('input');
    expect(screen.getByRole('button', { name: 'Copy' })).toHaveClass('btn', 'btn-primary');
    expect(screen.getByRole('button', { name: 'Dismiss' })).toHaveClass('btn', 'btn-ghost');
  });

  // The acknowledgement is an in-place mono label on the Copy button — never a toast, never a
  // portalled node outside the strip (ADR 0008).
  it('acknowledges the copy in place, not in a toast', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });

    const { container } = render(
      <SecretReveal
        heading="New key created — shown once"
        description="Copy it now."
        secret={secret}
        onDismiss={() => {}}
      />
    );

    await act(async () => {
      screen.getByRole('button', { name: 'Copy' }).click();
    });

    const acknowledgement = screen.getByRole('button', { name: 'Copied' });
    expect(container).toContainElement(acknowledgement);
    expect(document.querySelector('[role="status"], [role="alert"], .toast')).toBeNull();
  });

  it('dismisses only via the explicit × control', () => {
    const handleDismiss = vi.fn();
    render(
      <SecretReveal
        heading="New key created — shown once"
        description="Copy it now."
        secret={secret}
        onDismiss={handleDismiss}
      />
    );

    screen.getByRole('button', { name: 'Dismiss' }).click();
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });
});
