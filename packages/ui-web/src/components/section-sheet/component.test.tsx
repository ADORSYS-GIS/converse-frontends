import React from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SectionSheet } from './component';

// `useIsBelowLg` defaults to "assume below lg" when `matchMedia` is unavailable (jsdom doesn't
// implement it here) — which matches the below-lg behaviour most of these tests want by
// default. The `lg`-specific tests mock `matchMedia` explicitly to prove the opposite case.
function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe('SectionSheet', () => {
  afterEach(() => {
    // @ts-expect-error - restore jsdom's own "matchMedia does not exist" baseline.
    delete window.matchMedia;
  });

  it('is unmounted when closed', () => {
    render(
      <SectionSheet open={false} onOpenChange={vi.fn()} label="Filters">
        <div>Filter fields</div>
      </SectionSheet>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Filter fields')).not.toBeInTheDocument();
  });

  it('mounts as a dialog labelled by the section label when open, below lg', () => {
    render(
      <SectionSheet open onOpenChange={vi.fn()} label="Filters">
        <div>Filter fields</div>
      </SectionSheet>,
    );

    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeInTheDocument();
    expect(screen.getByText('Filter fields')).toBeInTheDocument();
  });

  it('calls onOpenChange(false) via the close control', () => {
    const onOpenChange = vi.fn();
    render(
      <SectionSheet open onOpenChange={onOpenChange} label="Filters">
        <div>Filter fields</div>
      </SectionSheet>,
    );

    screen.getByRole('button', { name: 'Close' }).click();

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  // Layer 2, and it goes on the PORTAL: that one element contains the panel, the scrim and Base
  // UI's own unclassable full-screen press-absorber, so it is the only class that hides all of
  // the sheet rather than just the visible parts of it.
  it('is CSS-tiered lg:hidden on the portal that holds the whole sheet', () => {
    render(
      <SectionSheet open onOpenChange={vi.fn()} label="Filters">
        <div>Filter fields</div>
      </SectionSheet>,
    );

    const portal = document.querySelector('[data-base-ui-portal]');
    expect(portal).toHaveClass('lg:hidden');
    expect(portal).toContainElement(screen.getByRole('dialog'));
  });

  // The primary defence against the real bug this component's docstring documents: a caller
  // setting `open={true}` at `lg` (e.g. a selection-driven effect that fires at every tier, or a
  // sheet left open in state across a resize past `lg`) must never actually mount a modal drawer
  // there — CSS alone (`lg:hidden`) hides it visually, but the drawer's modality still runs on a
  // merely-mounted-with-`open`-true sheet regardless of its own display:none, leaving the page
  // scroll-locked behind a full-screen press-absorber. Suppressing `open` itself, not just its
  // visibility, is the only thing that stops that.
  it('never mounts a dialog at lg, even when the caller sets open=true', () => {
    mockMatchMedia(false); // simulate `lg`
    render(
      <SectionSheet open onOpenChange={vi.fn()} label="Filters">
        <div>Filter fields</div>
      </SectionSheet>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.querySelector('[data-base-ui-portal]')).not.toBeInTheDocument();
  });

  it('mirrors the suppressed-at-lg state back to the caller via onOpenChange(false), so a later resize back down does not spuriously reopen it from stale open=true', () => {
    mockMatchMedia(false); // simulate `lg`
    const onOpenChange = vi.fn();
    render(
      <SectionSheet open onOpenChange={onOpenChange} label="Filters">
        <div>Filter fields</div>
      </SectionSheet>,
    );

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
