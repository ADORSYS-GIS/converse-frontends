import {
  EXPIRING_SOON_WINDOW_DAYS,
  EXPIRY_PRESET_DAYS,
  dateOnlyToExpiresAt,
  daysUntilExpiry,
  expiresAtToDateOnly,
  getDerivedStatus,
  getExpiryUrgency,
  isExpired,
  presetToExpiresAt,
} from '../api-key-expiry';

describe('presetToExpiresAt', () => {
  it('adds the preset day count to now, preserving time-of-day', () => {
    const now = new Date('2026-06-01T09:30:00.000Z');

    expect(presetToExpiresAt(EXPIRY_PRESET_DAYS.thirtyDays, now)).toBe('2026-07-01T09:30:00.000Z');
    expect(presetToExpiresAt(EXPIRY_PRESET_DAYS.sixtyDays, now)).toBe('2026-07-31T09:30:00.000Z');
    expect(presetToExpiresAt(EXPIRY_PRESET_DAYS.ninetyDays, now)).toBe('2026-08-30T09:30:00.000Z');
  });
});

describe('dateOnlyToExpiresAt', () => {
  it('anchors a valid YYYY-MM-DD date at UTC midnight', () => {
    expect(dateOnlyToExpiresAt('2026-12-31')).toBe('2026-12-31T00:00:00.000Z');
  });

  it('rejects malformed input', () => {
    expect(dateOnlyToExpiresAt('12/31/2026')).toBeUndefined();
    expect(dateOnlyToExpiresAt('not-a-date')).toBeUndefined();
    expect(dateOnlyToExpiresAt('2026-13-40')).toBeUndefined();
    expect(dateOnlyToExpiresAt('')).toBeUndefined();
    expect(dateOnlyToExpiresAt('   ')).toBeUndefined();
  });
});

describe('expiresAtToDateOnly', () => {
  it('returns an empty string for null/undefined/unparseable input', () => {
    expect(expiresAtToDateOnly(null)).toBe('');
    expect(expiresAtToDateOnly(undefined)).toBe('');
    expect(expiresAtToDateOnly('not-a-date')).toBe('');
  });

  it('reads back the UTC calendar day', () => {
    expect(expiresAtToDateOnly('2026-12-31T00:00:00.000Z')).toBe('2026-12-31');
  });
});

describe('timezone handling (dateOnlyToExpiresAt <-> expiresAtToDateOnly round-trip)', () => {
  // The regression this module exists to prevent: naively using local-time getters
  // (`getFullYear`/`getMonth`/`getDate`, or `toLocaleDateString`) to read back a UTC-midnight
  // `Date` reads the day *before* the one that was actually stored, for any timezone with a
  // negative UTC offset (i.e. most of the Americas) -- and the day *after*, for positive
  // offsets, once the input crosses 23:00 UTC.
  //
  // Reassigning `process.env.TZ` mid-test does NOT reliably flip these functions' behavior in
  // this repo's jest-expo test environment -- verified directly: `Intl.DateTimeFormat().
  // resolvedOptions().timeZone` still reports the machine's real zone after an in-test
  // `process.env.TZ = 'America/New_York'`, so a test asserting on wall-clock output would pass
  // or fail depending on the *runner's* real timezone, not on whether the implementation is
  // actually UTC-safe -- exactly the kind of flake this suite must not have.
  //
  // Instead, this spies on `Date.prototype`'s local-time getters and proves the two functions
  // never call them at all -- they only ever use `getTime()`/`toISOString()` (UTC-based), which
  // is the actual property that makes them timezone-safe on every machine, not just this one.
  const localGetterNames = [
    'getFullYear',
    'getMonth',
    'getDate',
    'getDay',
    'getHours',
    'getMinutes',
    'getSeconds',
    'getMilliseconds',
  ] as const;

  function spyOnLocalGetters() {
    return localGetterNames.map((name) => jest.spyOn(Date.prototype, name));
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('dateOnlyToExpiresAt never reads local-time fields', () => {
    const spies = spyOnLocalGetters();

    expect(dateOnlyToExpiresAt('2026-01-15')).toBe('2026-01-15T00:00:00.000Z');

    for (const spy of spies) {
      expect(spy).not.toHaveBeenCalled();
    }
  });

  it('expiresAtToDateOnly never reads local-time fields', () => {
    const spies = spyOnLocalGetters();

    expect(expiresAtToDateOnly('2026-01-15T00:00:00.000Z')).toBe('2026-01-15');

    for (const spy of spies) {
      expect(spy).not.toHaveBeenCalled();
    }
  });

  it('round-trips a plain date and a New Year boundary date back to themselves', () => {
    for (const draft of ['2026-01-15', '2027-01-01', '2026-12-31']) {
      const isoValue = dateOnlyToExpiresAt(draft);
      expect(isoValue).toBe(`${draft}T00:00:00.000Z`);
      expect(expiresAtToDateOnly(isoValue)).toBe(draft);
    }
  });
});

describe('isExpired', () => {
  const now = new Date('2026-06-15T00:00:00.000Z');

  it('is false when there is no expiration', () => {
    expect(isExpired(null, now)).toBe(false);
    expect(isExpired(undefined, now)).toBe(false);
  });

  it('is false for a future expiration and true for a past one', () => {
    expect(isExpired('2026-07-01T00:00:00.000Z', now)).toBe(false);
    expect(isExpired('2026-06-01T00:00:00.000Z', now)).toBe(true);
  });

  it('treats the exact expiry instant as already expired', () => {
    expect(isExpired('2026-06-15T00:00:00.000Z', now)).toBe(true);
  });
});

describe('daysUntilExpiry', () => {
  const now = new Date('2026-06-15T00:00:00.000Z');

  it('returns null when there is no expiration or the value is unparseable', () => {
    expect(daysUntilExpiry(null, now)).toBeNull();
    expect(daysUntilExpiry('not-a-date', now)).toBeNull();
  });

  it('rounds up to whole days remaining', () => {
    expect(daysUntilExpiry('2026-06-16T00:00:00.000Z', now)).toBe(1);
    expect(daysUntilExpiry('2026-06-16T01:00:00.000Z', now)).toBe(2);
    expect(daysUntilExpiry('2026-06-01T00:00:00.000Z', now)).toBe(-14);
  });
});

describe('getExpiryUrgency', () => {
  const now = new Date('2026-06-15T00:00:00.000Z');

  it('is "none" when there is no expiration', () => {
    expect(getExpiryUrgency(null, now)).toBe('none');
    expect(getExpiryUrgency(undefined, now)).toBe('none');
  });

  it('is "expired" once past the expiry instant', () => {
    expect(getExpiryUrgency('2026-06-01T00:00:00.000Z', now)).toBe('expired');
  });

  it(`is "soon" within the ${EXPIRING_SOON_WINDOW_DAYS}-day window`, () => {
    const soonDate = new Date(now.getTime() + EXPIRING_SOON_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    expect(getExpiryUrgency(soonDate.toISOString(), now)).toBe('soon');
  });

  it('is "far" just outside the soon window', () => {
    const farDate = new Date(now.getTime() + (EXPIRING_SOON_WINDOW_DAYS + 1) * 24 * 60 * 60 * 1000);
    expect(getExpiryUrgency(farDate.toISOString(), now)).toBe('far');
  });
});

describe('getDerivedStatus', () => {
  const now = new Date('2026-06-15T00:00:00.000Z');

  it('is "revoked" whenever the backend status says so, regardless of expiry', () => {
    expect(
      getDerivedStatus({ status: 'revoked', expiresAt: '2030-01-01T00:00:00.000Z' }, now)
    ).toBe('revoked');
  });

  it('is "expired" for an active-but-past-expiry key', () => {
    expect(getDerivedStatus({ status: 'active', expiresAt: '2026-01-01T00:00:00.000Z' }, now)).toBe(
      'expired'
    );
  });

  it('is "active" for an active key with no expiration or a future one', () => {
    expect(getDerivedStatus({ status: 'active', expiresAt: null }, now)).toBe('active');
    expect(getDerivedStatus({ status: 'active', expiresAt: '2030-01-01T00:00:00.000Z' }, now)).toBe(
      'active'
    );
  });
});
