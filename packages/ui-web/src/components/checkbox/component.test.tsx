import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Checkbox, CheckboxGroup } from './component';

// Base UI's checkbox commits on `click`, but its parent/group wiring tracks the pointer press
// that preceded it -- the same reason `scope-select`'s tests fire a real `pointerdown` first.
function press(element: HTMLElement) {
  fireEvent.pointerDown(element, { pointerId: 1, pointerType: 'mouse', isPrimary: true });
  fireEvent.click(element);
}

describe('Checkbox', () => {
  it('carries the daisy paint class rather than re-declaring the box', () => {
    render(<Checkbox label="Include zero-usage keys" checked={false} onCheckedChange={() => {}} />);
    expect(screen.getByRole('checkbox')).toHaveClass('checkbox');
  });

  it('associates its label, so clicking the text ticks the box', () => {
    const onCheckedChange = vi.fn();
    render(
      <Checkbox label="Include zero-usage keys" checked={false} onCheckedChange={onCheckedChange} />
    );

    expect(screen.getByRole('checkbox', { name: 'Include zero-usage keys' })).toBeInTheDocument();
    press(screen.getByText('Include zero-usage keys'));

    expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything());
  });

  it('reports the new state when ticked and when unticked', () => {
    const onCheckedChange = vi.fn();
    const { rerender } = render(
      <Checkbox label="Include" checked={false} onCheckedChange={onCheckedChange} />
    );

    press(screen.getByRole('checkbox'));
    expect(onCheckedChange).toHaveBeenLastCalledWith(true, expect.anything());

    rerender(<Checkbox label="Include" checked onCheckedChange={onCheckedChange} />);
    press(screen.getByRole('checkbox'));
    expect(onCheckedChange).toHaveBeenLastCalledWith(false, expect.anything());
  });

  it('exposes the mixed state as `aria-checked="mixed"`', () => {
    render(<Checkbox label="All statuses" indeterminate onCheckedChange={() => {}} />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'mixed');
  });

  // daisy's own `.checkbox:indeterminate` rule can never match Base UI's `<span role="checkbox">`,
  // so the mark is driven off this attribute instead -- if it stops being emitted the box goes
  // blank with no visible failure.
  it('marks the mixed state with `data-indeterminate` for the paint to hang off', () => {
    render(<Checkbox label="All statuses" indeterminate onCheckedChange={() => {}} />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('data-indeterminate');
  });

  it("marks a disabled box with `data-disabled`, which is what daisy's `:disabled` cannot match", () => {
    render(<Checkbox label="Include" checked={false} disabled onCheckedChange={() => {}} />);
    const box = screen.getByRole('checkbox');
    expect(box).toHaveAttribute('data-disabled');
    // A `<span role="checkbox">` cannot carry the native `disabled` attribute, which is the whole
    // reason daisy's `.checkbox:disabled` rule is dead here.
    expect(box).toHaveAttribute('aria-disabled', 'true');
  });

  it('takes an aria-label when it has no visible label', () => {
    render(<Checkbox aria-label="Select row" checked onCheckedChange={() => {}} />);
    expect(screen.getByRole('checkbox', { name: 'Select row' })).toBeInTheDocument();
  });
});

const STATUSES = ['active', 'revoked', 'expiring'];

function Group({ initial = [] as string[] }) {
  const [value, setValue] = useState<string[]>(initial);
  return (
    <>
      <CheckboxGroup
        aria-label="Status"
        value={value}
        onValueChange={setValue}
        allValues={STATUSES}>
        <Checkbox parent label="All statuses" />
        {STATUSES.map((status) => (
          <Checkbox key={status} name={status} label={status} />
        ))}
      </CheckboxGroup>
      <output data-testid="value">{value.join(',')}</output>
    </>
  );
}

describe('CheckboxGroup', () => {
  it('adds a ticked box to the value array', () => {
    render(<Group />);
    press(screen.getByRole('checkbox', { name: 'revoked' }));
    expect(screen.getByTestId('value')).toHaveTextContent('revoked');
  });

  it('removes an unticked box from the value array', () => {
    render(<Group initial={['active', 'revoked']} />);
    press(screen.getByRole('checkbox', { name: 'active' }));
    expect(screen.getByTestId('value')).toHaveTextContent('revoked');
    expect(screen.getByTestId('value')).not.toHaveTextContent('active');
  });

  // This is what `allValues` buys, and why the group is its own primitive: the parent's tri-state
  // is derived, never computed by the caller.
  it('derives the parent box as mixed when only some children are ticked', () => {
    render(<Group initial={['active']} />);
    expect(screen.getByRole('checkbox', { name: 'All statuses' })).toHaveAttribute(
      'aria-checked',
      'mixed'
    );
  });

  it('derives the parent box as ticked when every child is ticked', () => {
    render(<Group initial={STATUSES} />);
    expect(screen.getByRole('checkbox', { name: 'All statuses' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('derives the parent box as unticked when nothing is ticked', () => {
    render(<Group />);
    expect(screen.getByRole('checkbox', { name: 'All statuses' })).toHaveAttribute(
      'aria-checked',
      'false'
    );
  });

  it('ticks every child when the parent box is pressed', () => {
    render(<Group />);
    press(screen.getByRole('checkbox', { name: 'All statuses' }));
    expect(screen.getByTestId('value')).toHaveTextContent('active,revoked,expiring');
  });

  it('disables every box in the group at once', () => {
    render(
      <CheckboxGroup aria-label="Status" value={[]} onValueChange={() => {}} disabled>
        <Checkbox name="active" label="active" />
      </CheckboxGroup>
    );
    expect(screen.getByRole('checkbox', { name: 'active' })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
  });
});
