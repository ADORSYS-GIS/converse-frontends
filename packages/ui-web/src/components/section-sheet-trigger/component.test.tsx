import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SectionSheetTrigger } from './component';

function renderTrigger() {
  return render(
    <SectionSheetTrigger icon="filter" triggerLabel="Open filters" label="FILTERS">
      <button type="button">Reset</button>
    </SectionSheetTrigger>
  );
}

describe('SectionSheetTrigger', () => {
  it('opens only the labelled section as a sheet', () => {
    renderTrigger();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open filters' }));

    const dialog = screen.getByRole('dialog', { name: 'FILTERS' });
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
});
