import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SectionSheetTrigger } from './component';

function renderTrigger() {
  return render(
    <SectionSheetTrigger icon="filter" triggerLabel="Open filters" label="Filters">
      <button type="button">Reset</button>
    </SectionSheetTrigger>
  );
}

describe('SectionSheetTrigger', () => {
  it('opens only the labelled section as a sheet', () => {
    renderTrigger();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open filters' }));

    const dialog = screen.getByRole('dialog', { name: 'Filters' });
    expect(within(dialog).getByRole('button', { name: 'Reset' })).toBeInTheDocument();
  });

  it('dismisses the sheet from its close control', () => {
    renderTrigger();
    fireEvent.click(screen.getByRole('button', { name: 'Open filters' }));

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps the trigger out of the layout at lg (lg:hidden, never a JS tier prop)', () => {
    renderTrigger();
    expect(screen.getByRole('button', { name: 'Open filters' })).toHaveClass('lg:hidden');
  });

  // The controlled form of the uncontrolled convenience above (ADR 0010: a component may own its
  // own open flag, but it must always let the consumer own it instead). `apps/console` is that
  // consumer: ADR 0011 keeps *which rail section is open* in the query string, so the sheet has to
  // open from a link and close on Back — neither of which an internally-owned flag can do.
  describe('controlled', () => {
    it('renders open from the prop alone, with no click', () => {
      render(
        <SectionSheetTrigger
          icon="filter"
          triggerLabel="Open filters"
          label="Filters"
          open
          onOpenChange={() => {}}>
          <button type="button">Reset</button>
        </SectionSheetTrigger>
      );

      expect(screen.getByRole('dialog', { name: 'Filters' })).toBeInTheDocument();
    });

    it('reports open and close requests instead of acting on them itself', () => {
      const onOpenChange = vi.fn();
      render(
        <SectionSheetTrigger
          icon="filter"
          triggerLabel="Open filters"
          label="Filters"
          open={false}
          onOpenChange={onOpenChange}>
          <button type="button">Reset</button>
        </SectionSheetTrigger>
      );

      fireEvent.click(screen.getByRole('button', { name: 'Open filters' }));

      expect(onOpenChange).toHaveBeenCalledWith(true);
      // The consumer owns the flag: until it says otherwise, the sheet stays shut.
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
