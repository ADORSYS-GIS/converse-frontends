import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BottomSheet } from './component';

describe('BottomSheet — transient modal drawer', () => {
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

  it('closes on Escape while open', () => {
    const onOpenChange = vi.fn();
    render(
      <BottomSheet open onOpenChange={onOpenChange} title="Nav">
        <div>Drawer content</div>
      </BottomSheet>,
    );

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

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

  it('renders without a title as an accessible untitled drawer', () => {
    render(
      <BottomSheet open onOpenChange={vi.fn()}>
        <div>Untitled content</div>
      </BottomSheet>,
    );

    expect(screen.getByRole('dialog', { name: 'Drawer' })).toBeInTheDocument();
  });

  it('applies overlayClassName to the backdrop — vaul portals to document.body, so a caller that needs the sheet itself CSS-tiered must target the overlay directly rather than a wrapping element', () => {
    render(
      <BottomSheet open onOpenChange={vi.fn()} title="Nav" overlayClassName="lg:hidden">
        <div>Drawer content</div>
      </BottomSheet>,
    );

    expect(document.querySelector('[data-vaul-overlay]')).toHaveClass('lg:hidden');
  });
});
