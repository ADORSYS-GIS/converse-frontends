import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BottomSheet } from './component';

/** Base UI's backdrop carries no identifying attribute of its own; the scrim class names it. */
const BACKDROP = '.bg-muted\\/80';

describe('BottomSheet — transient modal drawer', () => {
  it('is unmounted when closed', () => {
    render(
      <BottomSheet open={false} onOpenChange={vi.fn()} title="Nav">
        <div>Drawer content</div>
      </BottomSheet>
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Drawer content')).not.toBeInTheDocument();
  });

  it('mounts as a dialog with the title as its accessible name and a backdrop when open', () => {
    render(
      <BottomSheet open onOpenChange={vi.fn()} title="Nav">
        <div>Drawer content</div>
      </BottomSheet>
    );

    expect(screen.getByText('Drawer content')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Nav' })).toBeInTheDocument();
    expect(document.querySelector(BACKDROP)).toBeInTheDocument();
  });

  it('calls onOpenChange(false) via the close control', () => {
    const onOpenChange = vi.fn();
    render(
      <BottomSheet open onOpenChange={onOpenChange} title="Nav">
        <div>Drawer content</div>
      </BottomSheet>
    );

    screen.getByRole('button', { name: 'Close' }).click();

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes on Escape while open', () => {
    const onOpenChange = vi.fn();
    render(
      <BottomSheet open onOpenChange={onOpenChange} title="Nav">
        <div>Drawer content</div>
      </BottomSheet>
    );

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  // Owner's locked layout contract (2026-08-30 restatement): "bottom sheet on medium and small.
  // Not from sides." — `direction` is gone; the sheet is bottom-only, always.
  it('always sets the swipe axis the panel geometry is selected off to down', () => {
    render(
      <BottomSheet open onOpenChange={vi.fn()} title="Filters">
        <div>Bottom content</div>
      </BottomSheet>
    );

    expect(screen.getByRole('dialog')).toHaveAttribute('data-swipe-direction', 'down');
  });

  it('always renders the grab bar — bottom is the only direction now', () => {
    render(
      <BottomSheet open onOpenChange={vi.fn()} title="Filters">
        <div>Bottom content</div>
      </BottomSheet>
    );

    expect(document.querySelector('.sheet-handle')).toBeInTheDocument();
  });

  it('renders a subtitle line under the title when supplied', () => {
    render(
      <BottomSheet open onOpenChange={vi.fn()} title="gateway-prod" subtitle="adorsys-gis">
        <div>Content</div>
      </BottomSheet>
    );

    expect(screen.getByText('adorsys-gis')).toBeInTheDocument();
  });

  it('renders a sticky footer when supplied', () => {
    render(
      <BottomSheet
        open
        onOpenChange={vi.fn()}
        title="gateway-prod"
        footer={<button type="button">Rename</button>}>
        <div>Content</div>
      </BottomSheet>
    );

    expect(screen.getByRole('button', { name: 'Rename' })).toBeInTheDocument();
  });

  it('renders no footer region at all when the slot is omitted', () => {
    render(
      <BottomSheet open onOpenChange={vi.fn()} title="gateway-prod">
        <div>Content</div>
      </BottomSheet>
    );

    expect(document.querySelector('.sheet-footer')).not.toBeInTheDocument();
  });

  it('renders without a title as an accessible untitled drawer', () => {
    render(
      <BottomSheet open onOpenChange={vi.fn()}>
        <div>Untitled content</div>
      </BottomSheet>
    );

    expect(screen.getByRole('dialog', { name: 'Drawer' })).toBeInTheDocument();
  });

  // The tier-hiding contract, and the reason it is one prop rather than two: a modal portal also
  // holds Floating UI's `InternalBackdrop`, an unclassable fixed inset-0 press-absorber. Hiding
  // the backdrop and the panel would leave it on screen; hiding the portal takes all three.
  it('applies portalClassName to the portal wrapper, which contains everything the sheet paints', () => {
    render(
      <BottomSheet open onOpenChange={vi.fn()} title="Nav" portalClassName="lg:hidden">
        <div>Drawer content</div>
      </BottomSheet>
    );

    const portal = document.querySelector('[data-base-ui-portal]');
    expect(portal).toHaveClass('lg:hidden');
    expect(portal).toContainElement(screen.getByRole('dialog'));
    expect(portal).toContainElement(document.querySelector(BACKDROP));
    // Base UI's own press-absorber: fixed, full-bleed, and carrying no class we could target.
    const pressAbsorber = portal?.querySelector<HTMLElement>(
      ':scope > [role="presentation"]:not([class])'
    );
    expect(pressAbsorber?.style.position).toBe('fixed');
  });
});
