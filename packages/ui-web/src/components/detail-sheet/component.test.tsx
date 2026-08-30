import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DetailSheet } from './component';

function baseProps(
  overrides: Partial<React.ComponentProps<typeof DetailSheet>> = {}
): React.ComponentProps<typeof DetailSheet> {
  return {
    open: true,
    onOpenChange: vi.fn(),
    title: 'sk_live_49f3a2',
    children: <p>Detail body</p>,
    ...overrides,
  };
}

describe('DetailSheet', () => {
  it('renders nothing when closed', () => {
    render(<DetailSheet {...baseProps({ open: false })} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('names the dialog after the title', async () => {
    render(<DetailSheet {...baseProps()} />);
    expect(await screen.findByRole('dialog')).toHaveAccessibleName('sk_live_49f3a2');
  });

  it('renders the subtitle when given', async () => {
    render(<DetailSheet {...baseProps({ subtitle: 'Created 2026-08-30' })} />);
    await screen.findByRole('dialog');

    expect(screen.getByText('Created 2026-08-30')).toBeInTheDocument();
  });

  it('renders the body content', async () => {
    render(<DetailSheet {...baseProps()} />);
    expect(await screen.findByText('Detail body')).toBeInTheDocument();
  });

  it('renders the footer only when given', async () => {
    const { rerender } = render(<DetailSheet {...baseProps()} />);
    await screen.findByRole('dialog');
    expect(screen.queryByText('Footer actions')).not.toBeInTheDocument();

    rerender(<DetailSheet {...baseProps({ footer: <p>Footer actions</p> })} />);
    expect(screen.getByText('Footer actions')).toBeInTheDocument();
  });

  it('fires onOpenChange(false) when the close control is clicked', async () => {
    const onOpenChange = vi.fn();
    render(<DetailSheet {...baseProps({ onOpenChange })} />);
    await screen.findByRole('dialog');

    screen.getByRole('button', { name: 'Close' }).click();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('fires onOpenChange(false) on Escape', async () => {
    const onOpenChange = vi.fn();
    render(<DetailSheet {...baseProps({ onOpenChange })} />);
    await screen.findByRole('dialog');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
