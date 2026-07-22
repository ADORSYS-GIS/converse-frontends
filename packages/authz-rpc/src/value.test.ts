import { describe, expect, it } from 'vitest';

import { tagValue, untagValue } from './value';

describe('tagValue / untagValue', () => {
  it('round-trips the empty-map defaultLimits shape', () => {
    const tagged = tagValue({});
    expect(tagged).toEqual({ Map: {} });
    expect(untagValue(tagged)).toEqual({});
  });

  it('round-trips the allowedModels list-of-strings shape', () => {
    const tagged = tagValue(['gpt-4', 'claude']);
    expect(tagged).toEqual({ List: [{ String: 'gpt-4' }, { String: 'claude' }] });
    expect(untagValue(tagged)).toEqual(['gpt-4', 'claude']);
  });

  it('round-trips nested maps, numbers, and booleans', () => {
    const value = { requestsPerMinute: 60, burst: 5.5, enabled: true, nested: { a: null } };
    expect(untagValue(tagValue(value))).toEqual(value);
  });

  it('tags a bare null as the unit variant', () => {
    expect(tagValue(null)).toBe('Null');
    expect(untagValue('Null')).toBeNull();
  });

  it('untagValue rejects a malformed tagged value', () => {
    expect(() => untagValue({ Bool: true, String: 'x' })).toThrow();
    expect(() => untagValue({ NotAVariant: 1 })).toThrow();
  });
});
