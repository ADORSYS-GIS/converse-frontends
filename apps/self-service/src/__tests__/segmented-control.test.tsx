import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SegmentedControl } from '@lightbridge/ui';

const options = [
  { key: 'a', label: 'Alpha' },
  { key: 'b', label: 'Beta' },
  { key: 'c', label: 'Gamma' },
];

describe('SegmentedControl', () => {
  it('renders every option label', async () => {
    await render(<SegmentedControl options={options} value="a" onChange={() => undefined} />);

    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.getByText('Beta')).toBeTruthy();
    expect(screen.getByText('Gamma')).toBeTruthy();
  });

  it('marks the active option as selected for accessibility', async () => {
    await render(<SegmentedControl options={options} value="b" onChange={() => undefined} />);

    expect(screen.getByLabelText('Beta').props.accessibilityState.selected).toBe(true);
    expect(screen.getByLabelText('Alpha').props.accessibilityState.selected).toBe(false);
  });

  it('calls onChange with the pressed option key', async () => {
    const onChange = jest.fn();
    await render(<SegmentedControl options={options} value="a" onChange={onChange} />);

    await fireEvent.press(screen.getByText('Gamma'));

    expect(onChange).toHaveBeenCalledWith('c');
  });
});
