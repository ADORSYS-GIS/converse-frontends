import { describe, expect, it } from 'vitest';

import {
  ADMIN_ROLE,
  buildSessionUser,
  checkAudience,
  decodeJwtClaims,
  extractRoles,
  isAdmin,
  normalizeAudience,
  type JwtClaims,
} from './tokens';

/** Builds an unsigned JWT with the given payload — decoding never verifies the signature. */
function jwt(claims: JwtClaims): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode(claims)}.c2ln`;
}

describe('decodeJwtClaims', () => {
  it('decodes a payload', () => {
    expect(decodeJwtClaims(jwt({ sub: 'u1' }))?.sub).toBe('u1');
  });

  it.each(['', 'a.b', 'a.b.c.d', 'not-a-jwt'])('returns null for %j', (token) => {
    expect(decodeJwtClaims(token)).toBeNull();
  });

  it('returns null when the payload is not JSON', () => {
    expect(decodeJwtClaims('aaa.$$$$.bbb')).toBeNull();
  });
});

describe('normalizeAudience', () => {
  it('wraps a single audience', () => {
    expect(normalizeAudience('one')).toEqual(['one']);
  });

  it('passes an array through and preserves absence', () => {
    expect(normalizeAudience(['a', 'b'])).toEqual(['a', 'b']);
    expect(normalizeAudience(undefined)).toBeUndefined();
  });
});

describe('checkAudience', () => {
  const expected = ['lightbridge-api-key', 'converse-frontend'];

  it('accepts a token whose aud intersects the expected set', () => {
    const result = checkAudience(jwt({ aud: ['converse-frontend'] }), expected, true);
    expect(result.valid).toBe(true);
    expect(result.audience).toEqual(['converse-frontend']);
  });

  it('accepts a single-string aud', () => {
    expect(checkAudience(jwt({ aud: 'lightbridge-api-key' }), expected, true).valid).toBe(true);
  });

  it('BLOCKS a token minted for a different audience', () => {
    const result = checkAudience(jwt({ aud: ['someone-else'] }), expected, true);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('audience mismatch');
  });

  it('BLOCKS a token with no aud claim when the audience is required', () => {
    const result = checkAudience(jwt({ sub: 'u1' }), expected, true);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('missing required audience');
  });

  it('allows a missing aud when AUDIENCE_REQUIRED is off', () => {
    expect(checkAudience(jwt({ sub: 'u1' }), expected, false).valid).toBe(true);
  });

  it('still blocks a WRONG aud even when AUDIENCE_REQUIRED is off', () => {
    // "not required" relaxes absence, never a mismatch — same as `validateJwtAudience`.
    expect(checkAudience(jwt({ aud: 'someone-else' }), expected, false).valid).toBe(false);
  });

  it('skips the check entirely when no expected audience is configured', () => {
    const result = checkAudience(jwt({ aud: 'anything' }), [], true);
    expect(result.valid).toBe(true);
    expect(result.audience).toEqual(['anything']);
  });

  it('fails closed on an undecodable token', () => {
    expect(checkAudience('garbage', expected, false).valid).toBe(false);
  });
});

describe('extractRoles', () => {
  it('reads the lightbridge_api_roles array claim', () => {
    expect(
      extractRoles(jwt({ lightbridge_api_roles: ['lightbridge-admin'] }), 'lightbridge_api_roles')
    ).toEqual(['lightbridge-admin']);
  });

  it('reads a space-delimited claim, mirroring Rbac::roles_claim', () => {
    expect(
      extractRoles(
        jwt({ lightbridge_api_roles: 'lightbridge-editor lightbridge-viewer' }),
        'lightbridge_api_roles'
      )
    ).toEqual(['lightbridge-editor', 'lightbridge-viewer']);
  });

  it('merges Keycloak realm roles', () => {
    expect(
      extractRoles(jwt({ realm_access: { roles: ['lightbridge-admin'] } }), 'lightbridge_api_roles')
    ).toContain('lightbridge-admin');
  });

  it('merges client roles for the configured client only', () => {
    const token = jwt({
      resource_access: {
        'self-service': { roles: ['lightbridge-editor'] },
        'other-client': { roles: ['lightbridge-admin'] },
      },
    });
    const roles = extractRoles(token, 'lightbridge_api_roles', 'self-service');
    expect(roles).toEqual(['lightbridge-editor']);
  });

  it('de-duplicates a role granted through two claims', () => {
    const token = jwt({
      lightbridge_api_roles: ['lightbridge-admin'],
      realm_access: { roles: ['lightbridge-admin'] },
    });
    expect(extractRoles(token, 'lightbridge_api_roles')).toEqual(['lightbridge-admin']);
  });

  it('drops non-string entries instead of trusting them', () => {
    expect(
      extractRoles(jwt({ lightbridge_api_roles: ['ok', 42, null] }), 'lightbridge_api_roles')
    ).toEqual(['ok']);
  });

  it('returns nothing for a malformed token or an absent claim', () => {
    expect(extractRoles('garbage', 'lightbridge_api_roles')).toEqual([]);
    expect(extractRoles(jwt({ sub: 'u1' }), 'lightbridge_api_roles')).toEqual([]);
  });
});

describe('isAdmin', () => {
  it('recognises exactly the lightbridge-admin role', () => {
    expect(isAdmin([ADMIN_ROLE])).toBe(true);
    expect(isAdmin(['lightbridge-editor', 'lightbridge-viewer'])).toBe(false);
    expect(isAdmin([])).toBe(false);
  });
});

describe('buildSessionUser', () => {
  it('prefers the access token claims', () => {
    const user = buildSessionUser(
      jwt({
        sub: 'u1',
        name: 'Ada',
        preferred_username: 'ada',
        email: 'ada@example.test',
        lightbridge_api_roles: ['lightbridge-admin'],
      }),
      'lightbridge_api_roles'
    );
    expect(user).toEqual({
      sub: 'u1',
      name: 'Ada',
      preferredUsername: 'ada',
      email: 'ada@example.test',
      roles: ['lightbridge-admin'],
    });
  });

  it('fills gaps from userinfo without letting it override the subject', () => {
    const user = buildSessionUser(jwt({ sub: 'u1' }), 'lightbridge_api_roles', undefined, {
      sub: 'someone-else',
      name: 'From Userinfo',
      email: 'ui@example.test',
    });
    expect(user?.sub).toBe('u1');
    expect(user?.name).toBe('From Userinfo');
    expect(user?.email).toBe('ui@example.test');
  });

  it('refuses to build a user with no subject anywhere', () => {
    expect(buildSessionUser(jwt({ name: 'nobody' }), 'lightbridge_api_roles')).toBeNull();
    expect(buildSessionUser('garbage', 'lightbridge_api_roles')).toBeNull();
  });
});
