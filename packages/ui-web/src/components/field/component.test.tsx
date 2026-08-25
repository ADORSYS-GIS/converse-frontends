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
    expect(input).toHaveAttribute('aria-invalid', 'true');
    // The `--signal` border on error is an `aria-invalid:` CSS variant (Base UI Field + daisy
    // `input`, ADR 0010 Decision 4), not a JS-toggled class -- `aria-invalid` is the contract to
    // assert, since the border-colour utility is present in the class list unconditionally.
    expect(input.className).toContain('aria-invalid:border-primary');
    expect(screen.getByText('A key with this name already exists.')).toBeInTheDocument();
  });

  it('renders a textarea when multiline is set', () => {
    render(<Field label="Decision note" multiline />);

    const control = screen.getByLabelText('Decision note');
    expect(control.tagName).toBe('TEXTAREA');
  });

  it('does not mark a valid control as invalid', () => {
    render(<Field label="Key name" />);

    expect(screen.getByLabelText('Key name')).toHaveAttribute('aria-invalid', 'false');
  });
});
