import { describe, expect, it } from 'vitest';

import { decodeRouteParam } from './route-params';

/**
 * `decodeRouteParam` is one line, and it is one line that a page renders an empty dashboard
 * without (converse-frontends#449, owner report 2026-09-03). What it owes a caller is stated here;
 * the LOOP it sits in — builder → route segment → decode → resolved query — is proved against the
 * real `dashboards.yaml` in `dashboards/usage-routes.test.ts`.
 */
describe('decodeRouteParam', () => {
  it('turns an encoded segment back into the id a link builder encoded', () => {
    expect(decodeRouteParam('cratestack%2Fcratestack')).toBe('cratestack/cratestack');
    expect(decodeRouteParam('missing%3Agithub%3Apreferred_username')).toBe(
      'missing:github:preferred_username'
    );
    expect(decodeRouteParam('console%20ui')).toBe('console ui');
    expect(decodeRouteParam('anthropic.claude-sonnet-4%3A0')).toBe('anthropic.claude-sonnet-4:0');
  });

  it('leaves an ordinary cuid2-shaped id exactly as it is', () => {
    expect(decodeRouteParam('usr_01j8k2m4p')).toBe('usr_01j8k2m4p');
    expect(decodeRouteParam('gpt-4o')).toBe('gpt-4o');
    expect(decodeRouteParam('')).toBe('');
  });

  /** Decoding is applied ONCE, at the route boundary. An id that really contains `%20` survives —
   *  the builder writes `%2520`, one decode gives `a%20b` back, and nothing downstream decodes
   *  again. A second decode anywhere would silently turn it into `a b`. */
  it('is a single decode, not a repeated one', () => {
    expect(decodeRouteParam('a%2520b')).toBe('a%20b');
    expect(decodeRouteParam(decodeRouteParam('a%2520b'))).toBe('a b'); // …which is the bug it must not do
  });

  /**
   * A malformed escape is a hand-typed URL, not a link this console minted. Returning the segment
   * as it stands makes the page query an id that does not exist and render the same "no usage"
   * reading any unknown id gets. Throwing would turn a typo into a 500; returning `''` would
   * silently widen a scoped query, which is the failure the resolver refuses placeholders for.
   */
  it('returns a malformed sequence unchanged rather than throwing', () => {
    expect(() => decodeRouteParam('100%')).not.toThrow();
    expect(decodeRouteParam('100%')).toBe('100%');
    expect(decodeRouteParam('%zz')).toBe('%zz');
    expect(decodeRouteParam('%E0%A4%A')).toBe('%E0%A4%A');
  });
});
