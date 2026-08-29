import React, { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SelectionSheet } from './component';

function Harness({ initial = null }: { initial?: string | null }) {
  const [selected, setSelected] = useState<string | null>(initial);
  return (
    <>
      <button type="button" onClick={() => setSelected('gateway-prod')}>
        Select row
      </button>
      <SelectionSheet selectionKey={selected} label="Selection">
        <span>{selected ?? 'No rows selected.'}</span>
      </SelectionSheet>
    </>
  );
}

describe('SelectionSheet', () => {
  it('stays closed while nothing is selected', () => {
    render(<Harness />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens on the first selection, with no trigger of its own', () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'Select row' }));

    const dialog = screen.getByRole('dialog', { name: 'Selection' });
    expect(within(dialog).getByText('gateway-prod')).toBeInTheDocument();
  });

  it('opens for a selection that is already present at mount (deep link / story)', () => {
    render(<Harness initial="batch-eval" />);

    expect(screen.getByRole('dialog', { name: 'Selection' })).toBeInTheDocument();
  });

  it('dismisses from its close control', () => {
    render(<Harness initial="batch-eval" />);

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
