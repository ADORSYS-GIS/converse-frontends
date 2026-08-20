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

  it('has no reachable "No expiry" option -- every preset button is a real expiration', async () => {
    await render(<ExpirySelector onChange={jest.fn()} />);

    expect(screen.queryByText('No expiry')).toBeNull();
    expect(screen.queryByRole('button', { name: 'No expiry' })).toBeNull();
  });

  it('reveals a date field for "Custom" and reports undefined until a date is entered', async () => {
    const onChange = jest.fn();
    await render(<ExpirySelector onChange={onChange} />);
    onChange.mockClear();

    await fireEvent.press(screen.getByText('Custom'));

    expect(onChange).toHaveBeenLastCalledWith(undefined);
    expect(screen.getByLabelText('Expiration date')).toBeTruthy();
  });

  it('reports the resolved ISO datetime once an in-range custom date is entered', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-01T00:00:00.000Z'));
    const onChange = jest.fn();
    await render(<ExpirySelector onChange={onChange} />);

    await fireEvent.press(screen.getByText('Custom'));
    // 30 days out from the frozen "now" -- comfortably inside [tomorrow, +90 days].
    await typeIntoDateField('2026-07-01');

    expect(onChange).toHaveBeenLastCalledWith('2026-07-01T00:00:00.000Z');
    jest.useRealTimers();
  });

  it('reports undefined again if the custom date is cleared', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-01T00:00:00.000Z'));
    const onChange = jest.fn();
    await render(<ExpirySelector onChange={onChange} />);

    await fireEvent.press(screen.getByText('Custom'));
    await typeIntoDateField('2026-07-01');
    await typeIntoDateField('');

    expect(onChange).toHaveBeenLastCalledWith(undefined);
    jest.useRealTimers();
  });

  describe('90-day cap enforcement', () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2026-06-01T00:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("sets the date field's max attribute to exactly 90 days out", async () => {
      await render(<ExpirySelector onChange={jest.fn()} />);
      await fireEvent.press(screen.getByText('Custom'));

      // Same instant the "90 days" preset itself resolves to (see the preset test above) --
      // proves the picker's own ceiling and the preset ceiling agree on the boundary.
      expect(screen.getByLabelText('Expiration date').props.max).toBe('2026-08-30');
    });

    it('rejects a custom date one day beyond the 90-day cap: resolves undefined and shows an error', async () => {
      const onChange = jest.fn();
      await render(<ExpirySelector onChange={onChange} />);
      await fireEvent.press(screen.getByText('Custom'));
      onChange.mockClear();

      // Break the code first: without the range check in `resolve()`, this line would instead
      // assert `onChange` was called with '2026-08-31T00:00:00.000Z' -- i.e. this test would have
      // failed for the predicted reason (the cap not being enforced) before the fix landed.
      await typeIntoDateField('2026-08-31');

      expect(onChange).toHaveBeenLastCalledWith(undefined);
      expect(screen.getByText('Choose a date between tomorrow and 90 days from now.')).toBeTruthy();
    });

    it('accepts a custom date exactly at the 90-day cap (inclusive boundary)', async () => {
      const onChange = jest.fn();
      await render(<ExpirySelector onChange={onChange} />);
      await fireEvent.press(screen.getByText('Custom'));
      onChange.mockClear();

      await typeIntoDateField('2026-08-30');

      expect(onChange).toHaveBeenLastCalledWith('2026-08-30T00:00:00.000Z');
    });
  });

  describe('past/present rejection', () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2026-06-01T00:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("sets the date field's min attribute to tomorrow, not today", async () => {
      await render(<ExpirySelector onChange={jest.fn()} />);
      await fireEvent.press(screen.getByText('Custom'));

      expect(screen.getByLabelText('Expiration date').props.min).toBe('2026-06-02');
    });

    it("rejects today's date: resolves undefined and shows an error", async () => {
      const onChange = jest.fn();
      await render(<ExpirySelector onChange={onChange} />);
      await fireEvent.press(screen.getByText('Custom'));
      onChange.mockClear();

      // Break the code first: without the "anchor at UTC midnight resolves to <= now" check,
      // this would instead resolve to '2026-06-01T00:00:00.000Z' -- a timestamp already in the
      // past relative to the frozen "now" of 2026-06-01T00:00:00.000Z (equal, in fact), which is
      // exactly the bug this test exists to catch.
      await typeIntoDateField('2026-06-01');

      expect(onChange).toHaveBeenLastCalledWith(undefined);
      expect(screen.getByText('Choose a date between tomorrow and 90 days from now.')).toBeTruthy();
    });

    it('rejects a date in the past', async () => {
      const onChange = jest.fn();
      await render(<ExpirySelector onChange={onChange} />);
      await fireEvent.press(screen.getByText('Custom'));
      onChange.mockClear();

      await typeIntoDateField('2026-05-01');

      expect(onChange).toHaveBeenLastCalledWith(undefined);
    });

    it('accepts tomorrow', async () => {
      const onChange = jest.fn();
      await render(<ExpirySelector onChange={onChange} />);
      await fireEvent.press(screen.getByText('Custom'));
      onChange.mockClear();

      await typeIntoDateField('2026-06-02');

      expect(onChange).toHaveBeenLastCalledWith('2026-06-02T00:00:00.000Z');
    });
  });

  it('seeds the 30-day preset (not "No expiry") when the initial value is null', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-01T00:00:00.000Z'));
    const onChange = jest.fn();

    await render(<ExpirySelector initialValue={null} onChange={onChange} />);

    // A `null` initial value (a fresh create form, or a legacy key persisted before every key
    // required an expiration) now defaults to a real, resolved expiration -- there is no "No
    // expiry" state left to seed.
    expect(onChange).toHaveBeenCalledWith('2026-07-01T00:00:00.000Z');
    expect(screen.queryByLabelText('Expiration date')).toBeNull();
    jest.useRealTimers();
  });

  it('seeds "Custom" pre-filled with an existing expiresAt', async () => {
    const onChange = jest.fn();
    await render(<ExpirySelector initialValue="2026-09-15T00:00:00.000Z" onChange={onChange} />);

    expect(onChange).toHaveBeenCalledWith('2026-09-15T00:00:00.000Z');
    // `getByDisplayValue` targets RN's `TextInput`, not a raw DOM `<input>` -- read the host
    // element's `value` prop directly instead.
    expect(screen.getByLabelText('Expiration date').props.value).toBe('2026-09-15');
  });

  it('seeds a legacy expiresAt that is now beyond the 90-day cap without blocking Save', async () => {
    // Simulates a key whose expiration was set (validly, at the time) before this cap existed --
    // seeding must show the real value and report it as usable, not silently discard it as
    // `undefined` (which would block Save for e.g. a pure name edit on that same key; see
    // `resolve`'s `enforceRange` doc comment in the component).
    jest.useFakeTimers().setSystemTime(new Date('2026-06-01T00:00:00.000Z'));
    const onChange = jest.fn();

    await render(<ExpirySelector initialValue="2027-06-01T00:00:00.000Z" onChange={onChange} />);

    expect(onChange).toHaveBeenCalledWith('2027-06-01T00:00:00.000Z');
    jest.useRealTimers();
  });

  it('seeds an already-expired legacy expiresAt without blocking Save', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-01T00:00:00.000Z'));
    const onChange = jest.fn();

    await render(<ExpirySelector initialValue="2026-01-01T00:00:00.000Z" onChange={onChange} />);

    expect(onChange).toHaveBeenCalledWith('2026-01-01T00:00:00.000Z');
    jest.useRealTimers();
  });

  it('disables every preset option when disabled', async () => {
    await render(<ExpirySelector onChange={jest.fn()} disabled />);

    expect(screen.getByRole('button', { name: '30 days' }).props.accessibilityState.disabled).toBe(
      true
    );
    expect(screen.getByRole('button', { name: 'Custom' }).props.accessibilityState.disabled).toBe(
      true
    );
  });
});
