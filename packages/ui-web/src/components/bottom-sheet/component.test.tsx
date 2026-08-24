import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BottomSheet } from './component';

describe('BottomSheet', () => {
  it('renders the peek content when collapsed', () => {
    render(
      <BottomSheet open={false} onOpenChange={vi.fn()} title="VIEW & FILTERS" peek={<span>Peek summary</span>}>
        <div>Expanded content</div>
      </BottomSheet>,
    );

    expect(screen.getByText('Peek summary')).toBeInTheDocument();
    expect(screen.queryByText('Expanded content')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the expanded children and dialog semantics when open', () => {
    render(
      <BottomSheet open onOpenChange={vi.fn()} title="VIEW & FILTERS">
        <div>Expanded content</div>
      </BottomSheet>,
    );

    expect(screen.getByText('Expanded content')).toBeInTheDocument();
    const dialog = screen.getByRole('dialog', { name: 'VIEW & FILTERS' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('toggles via onOpenChange when the handle is activated', () => {
    const onOpenChange = vi.fn();
    render(
      <BottomSheet open={false} onOpenChange={onOpenChange} title="VIEW & FILTERS">
        <div>Expanded content</div>
      </BottomSheet>,
    );

    screen.getByRole('button', { expanded: false }).click();

    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it('closes on Escape while open', () => {
    const onOpenChange = vi.fn();
    render(
      <BottomSheet open onOpenChange={onOpenChange} title="VIEW & FILTERS">
        <div>Expanded content</div>
      </BottomSheet>,
    );

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
