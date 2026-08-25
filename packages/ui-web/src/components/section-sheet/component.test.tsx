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
      <SectionSheet open={false} onOpenChange={vi.fn()} label="FILTERS">
        <div>Filter fields</div>
      </SectionSheet>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Filter fields')).not.toBeInTheDocument();
  });

  it('mounts as a dialog labelled by the section label when open, below lg', () => {
    render(
      <SectionSheet open onOpenChange={vi.fn()} label="FILTERS">
        <div>Filter fields</div>
      </SectionSheet>,
    );

    expect(screen.getByRole('dialog', { name: 'FILTERS' })).toBeInTheDocument();
    expect(screen.getByText('Filter fields')).toBeInTheDocument();
  });

  it('calls onOpenChange(false) via the close control', () => {
    const onOpenChange = vi.fn();
    render(
      <SectionSheet open onOpenChange={onOpenChange} label="FILTERS">
        <div>Filter fields</div>
      </SectionSheet>,
    );

    screen.getByRole('button', { name: 'Close' }).click();

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('is CSS-tiered lg:hidden on both the dialog and its overlay — a second, static guard beyond the trigger visibility, applied directly since vaul portals to document.body', () => {
    render(
      <SectionSheet open onOpenChange={vi.fn()} label="FILTERS">
        <div>Filter fields</div>
      </SectionSheet>,
    );

    expect(screen.getByRole('dialog')).toHaveClass('lg:hidden');
    expect(document.querySelector('[data-vaul-overlay]')).toHaveClass('lg:hidden');
  });

  // The primary defence against the real bug this component's docstring documents: a caller
  // setting `open={true}` at `lg` (e.g. a selection-driven effect that fires at every tier, or a
  // sheet left open in state across a resize past `lg`) must never actually mount a real Radix
  // modal dialog there — CSS alone (`lg:hidden`) hides it visually, but Radix's `hideOthers()`
  // still runs on a merely-mounted-with-`open`-true dialog regardless of its own display:none,
  // freezing `pointer-events` on the rest of the page. Suppressing `open` itself, not just its
  // visibility, is the only thing that stops that.
  it('never mounts a dialog at lg, even when the caller sets open=true', () => {
    mockMatchMedia(false); // simulate `lg`
    render(
      <SectionSheet open onOpenChange={vi.fn()} label="FILTERS">
        <div>Filter fields</div>
      </SectionSheet>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.querySelector('[data-vaul-overlay]')).not.toBeInTheDocument();
  });

  it('mirrors the suppressed-at-lg state back to the caller via onOpenChange(false), so a later resize back down does not spuriously reopen it from stale open=true', () => {
    mockMatchMedia(false); // simulate `lg`
    const onOpenChange = vi.fn();
    render(
      <SectionSheet open onOpenChange={onOpenChange} label="FILTERS">
        <div>Filter fields</div>
      </SectionSheet>,
    );

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
