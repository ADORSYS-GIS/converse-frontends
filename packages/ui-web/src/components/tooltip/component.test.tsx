import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Tooltip } from './component';

describe('Tooltip', () => {
  it('renders the child as the trigger, with no wrapper element', () => {
    const { container } = render(
      <Tooltip content="Full project name">
        <span data-testid="anchor">gateway-prod…</span>
      </Tooltip>
    );

    expect(container.firstElementChild).toBe(screen.getByTestId('anchor'));
    expect(screen.getByTestId('anchor').tagName).toBe('SPAN');
  });

  it('gives a non-interactive anchor a tab stop, because focus has to open it', () => {
    render(
      <Tooltip content="Full project name">
        <span data-testid="anchor">gateway-prod…</span>
      </Tooltip>
    );

    expect(screen.getByTestId('anchor')).toHaveAttribute('tabindex', '0');
  });

  it('leaves an anchor that declares its own tabIndex alone', () => {
    render(
      <Tooltip content="Full project name">
        <span data-testid="anchor" tabIndex={-1}>
          gateway-prod…
        </span>
      </Tooltip>
    );

    expect(screen.getByTestId('anchor')).toHaveAttribute('tabindex', '-1');
  });

  it('opens on hover', async () => {
    render(
      <Tooltip content="Full project name" delay={0}>
        <span data-testid="anchor">gateway-prod…</span>
      </Tooltip>
    );

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    fireEvent.pointerEnter(screen.getByTestId('anchor'), { pointerType: 'mouse' });
    fireEvent.mouseEnter(screen.getByTestId('anchor'));

    expect(await screen.findByRole('tooltip')).toHaveTextContent('Full project name');
  });

  it('opens on keyboard focus, not only on hover', async () => {
    render(
      <Tooltip content="Full project name">
        <span data-testid="anchor">gateway-prod…</span>
      </Tooltip>
    );

    fireEvent.focus(screen.getByTestId('anchor'));

    expect(await screen.findByRole('tooltip')).toHaveTextContent('Full project name');
  });

  it('describes its trigger while open', async () => {
    render(
      <Tooltip content="Full project name">
        <span data-testid="anchor">gateway-prod…</span>
      </Tooltip>
    );

    fireEvent.focus(screen.getByTestId('anchor'));
    await screen.findByRole('tooltip');

    expect(screen.getByTestId('anchor')).toHaveAccessibleDescription('Full project name');
  });

  it('closes again when focus leaves', async () => {
    render(
      <Tooltip content="Full project name">
        <span data-testid="anchor">gateway-prod…</span>
      </Tooltip>
    );

    fireEvent.focus(screen.getByTestId('anchor'));
    await screen.findByRole('tooltip');
    fireEvent.blur(screen.getByTestId('anchor'));

    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
    expect(screen.getByTestId('anchor')).not.toHaveAttribute('aria-describedby');
  });

  it('renders the bare child, with no trigger wiring, when there is no content', () => {
    render(
      <Tooltip>
        <span data-testid="anchor">Nothing to explain</span>
      </Tooltip>
    );

    const anchor = screen.getByTestId('anchor');
    expect(anchor).not.toHaveAttribute('tabindex');
    expect(anchor).not.toHaveAttribute('aria-describedby');
  });
});
