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
      />,
    );

    const input = screen.getByLabelText('Secret value') as HTMLInputElement;
    expect(input.value).toBe(secret);
    expect(input).toHaveAttribute('readonly');
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
      />,
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

  it('dismisses only via the explicit × control', () => {
    const handleDismiss = vi.fn();
    render(
      <SecretReveal
        heading="New key created — shown once"
        description="Copy it now."
        secret={secret}
        onDismiss={handleDismiss}
      />,
    );

    screen.getByRole('button', { name: 'Dismiss' }).click();
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });
});
