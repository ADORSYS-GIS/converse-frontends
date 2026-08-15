import { pickerTruncationNotice } from '../entity-picker-field';

describe('pickerTruncationNotice', () => {
  it('returns the notice when the loaded count is less than the server total', () => {
    expect(pickerTruncationNotice(1000, 1247, 'Not everything could be loaded.')).toBe(
      'Not everything could be loaded.'
    );
  });

  it('returns undefined when the loaded count matches the server total (the normal case)', () => {
    expect(pickerTruncationNotice(12, 12, 'Not everything could be loaded.')).toBeUndefined();
  });

  it('returns undefined for an empty, complete list (0 loaded, 0 total)', () => {
    expect(pickerTruncationNotice(0, 0, 'Not everything could be loaded.')).toBeUndefined();
  });
});
