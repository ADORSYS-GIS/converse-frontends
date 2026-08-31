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

  // Both layouts are daisy's own: `fieldset` stacks the label over a full-width control,
  // `label` sets the two side by side. The trigger itself is the same class in both -- the
  // content width an inline trigger wants comes from `.label > button.input` in `theme.css`, so
  // the control never has to know which layout it landed in.
  it('renders both layouts from one control', () => {
    const { rerender, container } = render(
      <SelectField label="Range" value="last-30" options={options} onChange={() => {}} />
    );
    const trigger = () => screen.getByLabelText('Range');
    expect(trigger()).toHaveClass('input');
    expect(trigger().parentElement).toHaveClass('fieldset');

    rerender(
      <SelectField
        label="Range"
        value="last-30"
        options={options}
        onChange={() => {}}
        layout="inline"
      />
    );
    expect(trigger()).toHaveClass('input');
    expect(trigger().parentElement).toHaveClass('label');
    expect(container.querySelector('select')).toBeNull();
  });

  // `disabled` — the one capability that was missing here and drove `CreateApiKeyDialog`/
  // `CreateProjectDialog` to hand-roll their own `Select.Root` instead of this component
  // (unify-select, issue #368).
  it('disables the trigger via the whole-control disabled prop', () => {
    render(
      <SelectField
        label="Billing plan"
        value="last-30"
        options={options}
        onChange={() => {}}
        disabled
      />
    );

    expect(screen.getByLabelText('Billing plan')).toBeDisabled();
  });

  // `error` — the identical contract `Field`'s own `error` prop carries.
  it('marks the trigger invalid and renders the error line, wired by aria-describedby', () => {
    render(
      <SelectField
        label="Billing plan"
        value="last-30"
        options={options}
        onChange={() => {}}
        error="Choose a plan before continuing."
      />
    );

    const trigger = screen.getByLabelText('Billing plan');
    expect(trigger).toHaveAttribute('aria-invalid', 'true');
    const message = screen.getByText('Choose a plan before continuing.');
    expect(trigger.getAttribute('aria-describedby')).toBe(message.id);
  });

  // Regression coverage for the audit's own finding (issue #368): `OVERLAY_ITEM_CLASS` used to
  // gate the selected-row treatment on `data-[selected=true]`, a selector requiring the literal
  // string `"true"` that Base UI's `Select.Item` never sets — it renders bare `data-selected=""`,
  // exactly like its sibling `data-highlighted`. Moving the keyboard highlight off the already-
  // selected row must leave `data-selected` on the ORIGINAL row and `data-highlighted` on the
  // new one — two independent attributes on two different rows, not one state standing in for
  // both.
  it('keeps the selected marker on its own row after the keyboard highlight moves elsewhere', async () => {
    render(<SelectField label="Range" value="last-30" options={options} onChange={() => {}} />);

    fireEvent.click(screen.getByLabelText('Range'));
    const selected = await screen.findByRole('option', { name: 'Last 30 days' });
    const other = screen.getByRole('option', { name: 'Last 7 days' });
    expect(selected).toHaveAttribute('data-selected', '');

    fireEvent.keyDown(screen.getByLabelText('Range'), { key: 'ArrowUp' });

    expect(selected).toHaveAttribute('data-selected', '');
    expect(other).toHaveAttribute('data-highlighted', '');
    expect(selected).not.toHaveAttribute('data-highlighted');
  });
});
