import { formatDate, formatNullableDate } from '../api-keys-list-view';

describe('formatDate', () => {
  it('formats an ISO timestamp as "Mon DD, YYYY"', () => {
    expect(formatDate('2026-03-05T12:00:00Z')).toBe('Mar 05, 2026');
  });

  it('returns the raw input when it cannot be parsed as a date', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });
});

describe('formatNullableDate', () => {
  it('returns null for null, undefined, and empty string', () => {
    expect(formatNullableDate(null)).toBeNull();
    expect(formatNullableDate(undefined)).toBeNull();
    expect(formatNullableDate('')).toBeNull();
  });

  it('delegates to formatDate for a present value', () => {
    expect(formatNullableDate('2026-03-05T12:00:00Z')).toBe(formatDate('2026-03-05T12:00:00Z'));
  });
});
