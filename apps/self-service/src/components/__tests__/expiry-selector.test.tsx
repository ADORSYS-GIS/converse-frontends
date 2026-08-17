import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { initI18n } from '@lightbridge/i18n';

import { ExpirySelector } from '../expiry-selector';

beforeAll(() => {
  initI18n('en');
});

// `DateField` renders a raw DOM `<input type="date">` (react-native-web host element, see
// `packages/ui/src/components/date-field/component.tsx`), which only exposes a web-style
// `onChange` prop -- not RN's `onChangeText`. `fireEvent.changeText` looks for `onChangeText`
// and finds nothing on this element, so it silently no-ops; firing a plain 'change' event with
// a DOM-shaped `{ target: { value } }` payload is what actually invokes `onChange` here.
async function typeIntoDateField(text: string) {
  await fireEvent(screen.getByLabelText('Expiration date'), 'change', { target: { value: text } });
}

describe('ExpirySelector', () => {
  it('defaults to the 30-day preset and reports its resolved expiresAt on mount', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-01T00:00:00.000Z'));
    const onChange = jest.fn();

    await render(<ExpirySelector onChange={onChange} />);

    expect(onChange).toHaveBeenCalledWith('2026-07-01T00:00:00.000Z');
    jest.useRealTimers();
  });

  it('switches to 60/90-day presets and reports the recomputed expiresAt', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-01T00:00:00.000Z'));
    const onChange = jest.fn();

    await render(<ExpirySelector onChange={onChange} />);
    onChange.mockClear();

    await fireEvent.press(screen.getByText('60 days'));
    expect(onChange).toHaveBeenLastCalledWith('2026-07-31T00:00:00.000Z');

    await fireEvent.press(screen.getByText('90 days'));
    expect(onChange).toHaveBeenLastCalledWith('2026-08-30T00:00:00.000Z');

    jest.useRealTimers();
  });

  it('reports null for "No expiry"', async () => {
    const onChange = jest.fn();
    await render(<ExpirySelector onChange={onChange} />);
    onChange.mockClear();

    await fireEvent.press(screen.getByText('No expiry'));

    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('reveals a date field for "Custom" and reports undefined until a date is entered', async () => {
    const onChange = jest.fn();
    await render(<ExpirySelector onChange={onChange} />);
    onChange.mockClear();

    await fireEvent.press(screen.getByText('Custom'));

    expect(onChange).toHaveBeenLastCalledWith(undefined);
    expect(screen.getByLabelText('Expiration date')).toBeTruthy();
  });

  it('reports the resolved ISO datetime once a custom date is entered', async () => {
    const onChange = jest.fn();
    await render(<ExpirySelector onChange={onChange} />);

    await fireEvent.press(screen.getByText('Custom'));
    await typeIntoDateField('2026-12-31');

    expect(onChange).toHaveBeenLastCalledWith('2026-12-31T00:00:00.000Z');
  });

  it('reports undefined again if the custom date is cleared', async () => {
    const onChange = jest.fn();
    await render(<ExpirySelector onChange={onChange} />);

    await fireEvent.press(screen.getByText('Custom'));
    await typeIntoDateField('2026-12-31');
    await typeIntoDateField('');

    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });

  it('seeds "No expiry" when the initial value is null', async () => {
    const onChange = jest.fn();
    await render(<ExpirySelector initialValue={null} onChange={onChange} />);

    expect(onChange).toHaveBeenCalledWith(null);
    expect(screen.queryByLabelText('Expiration date')).toBeNull();
  });

  it('seeds "Custom" pre-filled with an existing expiresAt', async () => {
    const onChange = jest.fn();
    await render(<ExpirySelector initialValue="2026-09-15T00:00:00.000Z" onChange={onChange} />);

    expect(onChange).toHaveBeenCalledWith('2026-09-15T00:00:00.000Z');
    // `getByDisplayValue` targets RN's `TextInput`, not a raw DOM `<input>` -- read the host
    // element's `value` prop directly instead.
    expect(screen.getByLabelText('Expiration date').props.value).toBe('2026-09-15');
  });

  it('disables every preset option when disabled', async () => {
    await render(<ExpirySelector onChange={jest.fn()} disabled />);

    expect(screen.getByRole('button', { name: '30 days' }).props.accessibilityState.disabled).toBe(
      true
    );
    expect(
      screen.getByRole('button', { name: 'No expiry' }).props.accessibilityState.disabled
    ).toBe(true);
  });
});
