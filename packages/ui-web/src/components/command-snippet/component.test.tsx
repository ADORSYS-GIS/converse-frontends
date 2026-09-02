import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CommandSnippet } from './component';

const command = 'kubectl logs -f lci-run-4f21ac --namespace lightbridge';

describe('CommandSnippet', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('renders the command read-only, as code', () => {
    render(<CommandSnippet command={command} />);

    expect(screen.getByText(command)).toBeInTheDocument();
  });

  it('renders an optional label', () => {
    render(<CommandSnippet command={command} label="Stream this run’s logs" />);

    expect(screen.getByText('Stream this run’s logs')).toBeInTheDocument();
  });

  it('copies the command to the clipboard and shows a confirmation that resets on a timeout', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });

    render(<CommandSnippet command={command} />);

    await act(async () => {
      screen.getByRole('button', { name: 'Copy command' }).click();
    });

    expect(writeText).toHaveBeenCalledWith(command);
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByRole('button', { name: 'Copy command' })).toBeInTheDocument();
  });
});
