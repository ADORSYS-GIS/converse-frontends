import { describe, expect, it } from 'vitest';

import { asTrimmedString, asTrimmedStringOrNull } from './wire-safety';

describe('asTrimmedString', () => {
  it('trims a real string', () => {
    expect(asTrimmedString('  hello  ')).toBe('hello');
  });

  it('returns "" for null', () => {
    expect(asTrimmedString(null)).toBe('');
  });

  it('returns "" for undefined', () => {
    expect(asTrimmedString(undefined)).toBe('');
  });

  it('returns "" for a number -- the exact production incident shape', () => {
    // `TypeError: f.trim is not a function` in `AccountSettingsView`: `f` (`defaultQuota`) was a
    // present, non-string value that `?.`/`??` cannot catch since it isn't null/undefined.
    expect(asTrimmedString(42)).toBe('');
  });

  it('returns "" for a boolean', () => {
    expect(asTrimmedString(false)).toBe('');
  });

  it('returns "" for an array', () => {
    expect(asTrimmedString([])).toBe('');
  });

  it('returns "" for a plain object', () => {
    expect(asTrimmedString({})).toBe('');
  });
});

describe('asTrimmedStringOrNull', () => {
  it('trims a real string', () => {
    expect(asTrimmedStringOrNull('  hello  ')).toBe('hello');
  });

  it('returns null for null', () => {
    expect(asTrimmedStringOrNull(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(asTrimmedStringOrNull(undefined)).toBeNull();
  });

  it('returns null (not "") for a non-string, non-null value', () => {
    expect(asTrimmedStringOrNull(42)).toBeNull();
  });
});
