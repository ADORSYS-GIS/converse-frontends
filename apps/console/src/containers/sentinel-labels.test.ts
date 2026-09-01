import { describe, expect, it } from 'vitest';

import { sentinelLabel } from './sentinel-labels';

describe('sentinelLabel', () => {
  it('maps the two known identity-provider sentinels to a de-emphasized, friendly label', () => {
    expect(sentinelLabel('missing:keycloak:preferred_username')).toEqual({
      label: 'Unidentified — Keycloak',
      subtle: true,
    });
    expect(sentinelLabel('missing:github:preferred_username')).toEqual({
      label: 'Unidentified — GitHub',
      subtle: true,
    });
  });

  it('labels a bare "-" as-is, but subtly', () => {
    expect(sentinelLabel('-')).toEqual({ label: '-', subtle: true });
  });

  it('labels a repo-slug account id as-is, but subtly', () => {
    expect(sentinelLabel('adorsys-gis/converse-frontends')).toEqual({
      label: 'adorsys-gis/converse-frontends',
      subtle: true,
    });
  });

  it('falls through to the raw key at full emphasis for anything else unresolved', () => {
    expect(sentinelLabel('usr_9f3a2b')).toEqual({ label: 'usr_9f3a2b', subtle: false });
  });

  it('always prefers a resolved real name, never subtle', () => {
    expect(sentinelLabel('missing:keycloak:preferred_username', 'maria@brightline.dev')).toEqual({
      label: 'maria@brightline.dev',
      subtle: false,
    });
    expect(sentinelLabel('acct_123', 'brightline')).toEqual({ label: 'brightline', subtle: false });
  });

  it('ignores an empty resolved name rather than rendering a blank label', () => {
    expect(sentinelLabel('-', '')).toEqual({ label: '-', subtle: true });
  });
});
