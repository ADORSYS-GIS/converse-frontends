import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SelectField } from './component';

const options = [
  { value: 'last-7', label: 'Last 7 days' },
  { value: 'last-30', label: 'Last 30 days' },
];

// Base UI `Select.Item` commits only when a real `pointerdown` preceded the click on the same
// item -- see `scope-select/component.test.tsx` for the full note.
function selectOption(element: HTMLElement) {
  fireEvent.pointerDown(element, { pointerId: 1, pointerType: 'mouse', isPrimary: true });
  fireEvent.click(element);
}

describe('SelectField', () => {
  it('shows the selected option label on the trigger', () => {
    render(<SelectField label="Range" value="last-30" options={options} onChange={() => {}} />);

    expect(screen.getByLabelText('Range')).toHaveTextContent('Last 30 days');
  });

  it('is a Base UI combobox, never a native select', () => {
    const { container } = render(
      <SelectField label="Range" value="last-30" options={options} onChange={() => {}} />
    );

    expect(container.querySelector('select')).toBeNull();
    expect(screen.getByLabelText('Range')).toHaveAttribute('role', 'combobox');
  });

  it('lists every option when opened, and reports the chosen one', async () => {
    const onChange = vi.fn();
    render(<SelectField label="Range" value="last-30" options={options} onChange={onChange} />);

    fireEvent.click(screen.getByLabelText('Range'));
    selectOption(await screen.findByRole('option', { name: 'Last 7 days' }));

    expect(onChange).toHaveBeenCalledWith('last-7');
  });

  it('renders both layouts from one control', () => {
    const { rerender, container } = render(
      <SelectField label="Range" value="last-30" options={options} onChange={() => {}} />
    );
    expect(screen.getByLabelText('Range')).toHaveClass('w-full');

    rerender(
      <SelectField
        label="Range"
        value="last-30"
        options={options}
        onChange={() => {}}
        layout="inline"
      />
    );
    expect(screen.getByLabelText('Range')).toHaveClass('w-auto');
    expect(container.querySelector('select')).toBeNull();
  });
});
