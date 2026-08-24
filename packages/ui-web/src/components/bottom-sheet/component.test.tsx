import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BottomSheet } from './component';

describe('BottomSheet — peek mode (docked, vaul snapPoints)', () => {
  it('renders the peek content when collapsed, not the full children', () => {
    render(
      <BottomSheet open={false} onOpenChange={vi.fn()} title="VIEW & FILTERS" peek={<span>Peek summary</span>}>
        <div>Expanded content</div>
      </BottomSheet>,
    );

    expect(screen.getByText('Peek summary')).toBeInTheDocument();
    expect(screen.queryByText('Expanded content')).not.toBeInTheDocument();
  });

  it('renders the full children instead of peek content when open', () => {
    render(
      <BottomSheet open onOpenChange={vi.fn()} title="VIEW & FILTERS" peek={<span>Peek summary</span>}>
        <div>Expanded content</div>
      </BottomSheet>,
    );

    expect(screen.getByText('Expanded content')).toBeInTheDocument();
    expect(screen.queryByText('Peek summary')).not.toBeInTheDocument();
  });

  it('is non-modal while docked: no backdrop overlay, centre content stays interactive', () => {
    render(
      <BottomSheet open={false} onOpenChange={vi.fn()} title="VIEW & FILTERS" peek={<span>Peek summary</span>}>
        <div>Expanded content</div>
      </BottomSheet>,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(document.querySelector('[data-vaul-overlay]')).not.toBeInTheDocument();
  });

  it('toggles via onOpenChange when the title control is activated', () => {
    const onOpenChange = vi.fn();
    render(
      <BottomSheet open={false} onOpenChange={onOpenChange} title="VIEW & FILTERS" peek={<span>Peek summary</span>}>
        <div>Expanded content</div>
      </BottomSheet>,
    );

    screen.getByRole('button', { expanded: false, name: 'VIEW & FILTERS' }).click();

    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it('collapses via the close control when open', () => {
    const onOpenChange = vi.fn();
    render(
      <BottomSheet open onOpenChange={onOpenChange} title="VIEW & FILTERS" peek={<span>Peek summary</span>}>
        <div>Expanded content</div>
      </BottomSheet>,
    );

    screen.getByRole('button', { name: 'Close' }).click();

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes on Escape while open', () => {
    const onOpenChange = vi.fn();
    render(
      <BottomSheet open onOpenChange={onOpenChange} title="VIEW & FILTERS" peek={<span>Peek summary</span>}>
        <div>Expanded content</div>
      </BottomSheet>,
    );

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe('BottomSheet — transient modal drawer (no peek)', () => {
  it('is unmounted when closed', () => {
    render(
      <BottomSheet open={false} onOpenChange={vi.fn()} title="Nav">
        <div>Drawer content</div>
      </BottomSheet>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Drawer content')).not.toBeInTheDocument();
  });

  it('mounts as a dialog with the title as its accessible name and a backdrop overlay when open', () => {
    render(
      <BottomSheet open onOpenChange={vi.fn()} title="Nav">
        <div>Drawer content</div>
      </BottomSheet>,
    );

    expect(screen.getByText('Drawer content')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Nav' })).toBeInTheDocument();
    expect(document.querySelector('[data-vaul-overlay]')).toBeInTheDocument();
  });

  it('calls onOpenChange(false) via the close control', () => {
    const onOpenChange = vi.fn();
    render(
      <BottomSheet open onOpenChange={onOpenChange} title="Nav">
        <div>Drawer content</div>
      </BottomSheet>,
    );

    screen.getByRole('button', { name: 'Close' }).click();

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('supports a right-side direction', () => {
    render(
      <BottomSheet open onOpenChange={vi.fn()} title="Overflow" direction="right">
        <div>Right content</div>
      </BottomSheet>,
    );

    expect(screen.getByText('Right content')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveAttribute('data-vaul-drawer-direction', 'right');
  });
});
