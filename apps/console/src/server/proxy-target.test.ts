import { describe, expect, it } from 'vitest';

import { normalizeBasePath, trimTrailingSlash } from './env';
import {
  FORWARDED_REQUEST_HEADERS,
  InvalidProxyPathError,
  assertSafeSegments,
  budgetRpcTargetUrl,
  pickHeaders,
  rpcTargetUrl,
  usageTargetUrl,
} from './proxy-target';

describe('assertSafeSegments', () => {
  it('accepts cratestack op-ids', () => {
    expect(assertSafeSegments(['account.findMany'])).toEqual(['account.findMany']);
    expect(assertSafeSegments(['batch'])).toEqual(['batch']);
  });

  it.each([['..'], ['.'], [''], ['a/b'], ['a\\b'], ['a b'], ['%2e%2e'], ['a?b'], ['a#b']])(
    'rejects %j',
    (segment) => {
      expect(() => assertSafeSegments([segment])).toThrow(InvalidProxyPathError);
    }
  );

  it('rejects a traversal hidden in a later segment', () => {
    expect(() => assertSafeSegments(['usage', '..', '..', 'etc'])).toThrow(InvalidProxyPathError);
  });

  it('rejects an empty path outright', () => {
    expect(() => assertSafeSegments([])).toThrow(InvalidProxyPathError);
  });
});

describe('rpcTargetUrl', () => {
  it('composes backend + base path + op', () => {
    expect(rpcTargetUrl('http://localhost:13000', '/api', ['account.findMany'])).toBe(
      'http://localhost:13000/api/rpc/account.findMany'
    );
  });

  it('honours a non-default API_BASE_PATH', () => {
    expect(rpcTargetUrl('https://authz.example', '/v2', ['batch'])).toBe(
      'https://authz.example/v2/rpc/batch'
    );
  });

  it('cannot be escaped by a traversal segment', () => {
    expect(() => rpcTargetUrl('http://localhost:13000', '/api', ['..', 'admin'])).toThrow(
      InvalidProxyPathError
    );
  });
});

describe('budgetRpcTargetUrl', () => {
  it('preserves the fixed /budget prefix', () => {
    expect(budgetRpcTargetUrl('http://localhost:13005', ['getMyBudgetBalance'])).toBe(
      'http://localhost:13005/budget/rpc/getMyBudgetBalance'
    );
  });
});

describe('usageTargetUrl', () => {
  it('joins the usage backend path', () => {
    expect(usageTargetUrl('http://usage.internal', ['usage', 'v1', 'usage', 'query'])).toBe(
      'http://usage.internal/usage/v1/usage/query'
    );
  });
});

describe('base URL normalisation', () => {
  it('never doubles a slash', () => {
    expect(rpcTargetUrl(trimTrailingSlash('http://localhost:13000/'), '/api', ['op'])).toBe(
      'http://localhost:13000/api/rpc/op'
    );
  });

  it('normalises a base path with or without a leading slash', () => {
    expect(normalizeBasePath('api')).toBe('/api');
    expect(normalizeBasePath('/api/')).toBe('/api');
    expect(normalizeBasePath('/')).toBe('');
  });
});

describe('pickHeaders', () => {
  it('forwards only the allow-listed request headers', () => {
    const source = new Headers({
      'content-type': 'application/cbor',
      accept: 'application/cbor',
      cookie: 'lb_console_session.0=secret',
      authorization: 'Bearer attacker-supplied',
      'x-forwarded-for': '10.0.0.1',
      host: 'evil.example',
    });
    const picked = pickHeaders(source, FORWARDED_REQUEST_HEADERS);

    expect(picked.get('content-type')).toBe('application/cbor');
    expect(picked.get('accept')).toBe('application/cbor');
    // The two that matter: the browser's session cookie and any client-set Authorization must
    // never reach a backend. The proxy sets Authorization itself, afterwards.
    expect(picked.get('cookie')).toBeNull();
    expect(picked.get('authorization')).toBeNull();
    expect(picked.get('x-forwarded-for')).toBeNull();
    expect(picked.get('host')).toBeNull();
  });

  it('omits absent headers rather than writing empty values', () => {
    expect([...pickHeaders(new Headers(), FORWARDED_REQUEST_HEADERS).keys()]).toEqual([]);
  });
});
