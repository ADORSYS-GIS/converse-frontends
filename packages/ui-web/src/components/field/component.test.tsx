import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Field } from './component';

describe('Field', () => {
  it('associates the label with the input', () => {
    render(<Field label="Key name" />);

    expect(screen.getByLabelText('Key name')).toBeInTheDocument();
  });

  it('renders as an uncontrolled input via defaultValue', () => {
    render(<Field label="Key name" defaultValue="ci-deploy" />);

    const input = screen.getByLabelText('Key name') as HTMLInputElement;
    expect(input.value).toBe('ci-deploy');

    fireEvent.change(input, { target: { value: 'ci-deploy-2' } });
    expect(input.value).toBe('ci-deploy-2');
  });

  it('renders as a controlled input driven by value + onChange', () => {
    const handleChange = vi.fn();

    function Controlled() {
      const [value, setValue] = React.useState('a');
      return (
        <Field
          label="Key name"
          value={value}
          onChange={(event) => {
            handleChange(event.target.value);
            setValue(event.target.value);
          }}
        />
      );
    }

    render(<Controlled />);
    const input = screen.getByLabelText('Key name') as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'ab' } });
    expect(handleChange).toHaveBeenCalledWith('ab');
    expect(input.value).toBe('ab');
  });

  it('shows the error line and marks the control invalid', () => {
    render(<Field label="Key name" error="A key with this name already exists." />);

    const input = screen.getByLabelText('Key name');
    // The `--signal` border on error is CSS keyed off `aria-invalid` (Base UI Field + the
    // `@utility input` block, ADR 0010 Decision 4), never a JS-toggled class -- so the attribute
    // IS the contract, and the control's class list stays the single word it should be.
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveClass('input');
    expect(screen.getByText('A key with this name already exists.')).toBeInTheDocument();
  });

  it('renders a textarea when multiline is set', () => {
    render(<Field label="Decision note" multiline />);

    const control = screen.getByLabelText('Decision note');
    expect(control.tagName).toBe('TEXTAREA');
  });

  // Issue #445 — the example slot.
  it('renders the example under the label and describes the control with it', () => {
    render(<Field label="Refill ladder" example="e.g. 2, 5, 10, 25" />);

    const control = screen.getByLabelText('Refill ladder');
    const describedBy = control.getAttribute('aria-describedby') as string;
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy)?.textContent).toBe('e.g. 2, 5, 10, 25');
  });

  it('describes the control with the example AND the error when both are present', () => {
    render(
      <Field label="Refill ladder" example="e.g. 2, 5, 10, 25" error="Enter a positive amount." />
    );

    const control = screen.getByLabelText('Refill ladder');
    const described = (control.getAttribute('aria-describedby') as string)
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent);
    expect(described).toEqual(['e.g. 2, 5, 10, 25', 'Enter a positive amount.']);
  });

  it('keeps the example on screen while the control has a value — it is not a placeholder', () => {
    render(<Field label="Refill ladder" example="e.g. 2, 5, 10, 25" defaultValue="7" />);

    expect(screen.getByText('e.g. 2, 5, 10, 25')).toBeInTheDocument();
  });

  it('drops the example in the inline layout, where there is no room under the label', () => {
    render(<Field label="Refill ladder" example="e.g. 2, 5, 10, 25" layout="inline" />);

    expect(screen.queryByText('e.g. 2, 5, 10, 25')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Refill ladder')).not.toHaveAttribute('aria-describedby');
  });

  it('does not mark a valid control as invalid', () => {
    render(<Field label="Key name" />);

    expect(screen.getByLabelText('Key name')).toHaveAttribute('aria-invalid', 'false');
  });
});
