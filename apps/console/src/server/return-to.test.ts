import { describe, expect, it } from 'vitest';

import { sanitizeReturnTo } from './return-to';

describe('sanitizeReturnTo', () => {
  it('keeps a same-origin path with a query string', () => {
    expect(sanitizeReturnTo('/accounts/acct_1/projects?status=active')).toBe(
      '/accounts/acct_1/projects?status=active'
    );
  });

  it.each([
    ['//evil.example/phish', 'protocol-relative URL'],
    ['/\\evil.example', 'backslash protocol-relative URL'],
    ['https://evil.example', 'absolute URL'],
    ['javascript:alert(1)', 'javascript scheme'],
    ['projects', 'relative path with no leading slash'],
    ['', 'empty string'],
  ])('rejects %j (%s)', (value) => {
    expect(sanitizeReturnTo(value)).toBe('/');
  });

  it('rejects null and undefined', () => {
    expect(sanitizeReturnTo(null)).toBe('/');
    expect(sanitizeReturnTo(undefined)).toBe('/');
  });

  it('allows a colon inside the query, where it cannot read as a scheme', () => {
    expect(sanitizeReturnTo('/accounts/acct_1/projects?range=12:00')).toBe(
      '/accounts/acct_1/projects?range=12:00'
    );
  });

  it('honours a caller-supplied fallback', () => {
    expect(sanitizeReturnTo('https://evil.example', '/accounts/acct_1/api-keys')).toBe(
      '/accounts/acct_1/api-keys'
    );
  });
});
