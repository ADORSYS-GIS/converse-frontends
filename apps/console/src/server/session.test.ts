import { describe, expect, it } from 'vitest';

import {
  MAX_COOKIE_CHUNKS,
  MAX_COOKIE_CHUNK_LENGTH,
  allSessionCookieNames,
  chunkCookieName,
  chunkCookieValue,
  deriveSessionKey,
  joinCookieChunks,
  openAuthState,
  openSession,
  sealAuthState,
  sealSession,
  sessionCookieAttributes,
  type ConsoleSession,
} from './session';

const SECRET = 'a'.repeat(48);
const OTHER_SECRET = 'b'.repeat(48);

const SESSION: ConsoleSession = {
  sid: 'sid-1',
  tokens: {
    accessToken: 'header.payload.signature',
    refreshToken: 'refresh-token',
    idToken: 'id-token',
    expiresAt: 1_700_000_060_000,
    audience: ['lightbridge-api-key'],
  },
  user: {
    sub: 'user-1',
    name: 'Ada Lovelace',
    preferredUsername: 'ada',
    email: 'ada@example.test',
    roles: ['lightbridge-admin'],
  },
};

describe('deriveSessionKey', () => {
  it('produces a 32-byte key for A256GCM', () => {
    expect(deriveSessionKey(SECRET)).toHaveLength(32);
  });

  it('is deterministic for one secret and different across secrets', () => {
    expect(deriveSessionKey(SECRET)).toEqual(deriveSessionKey(SECRET));
    expect(deriveSessionKey(SECRET)).not.toEqual(deriveSessionKey(OTHER_SECRET));
  });
});

describe('sealSession / openSession', () => {
  it('round-trips a session', async () => {
    const sealed = await sealSession(SESSION, SECRET);
    await expect(openSession(sealed, SECRET)).resolves.toEqual(SESSION);
  });

  it('produces ciphertext that carries no token in the clear', async () => {
    const sealed = await sealSession(SESSION, SECRET);
    expect(sealed).not.toContain('refresh-token');
    expect(sealed).not.toContain('id-token');
    expect(sealed).not.toContain('ada@example.test');
  });

  it('refuses a session sealed with a different secret', async () => {
    const sealed = await sealSession(SESSION, SECRET);
    await expect(openSession(sealed, OTHER_SECRET)).resolves.toBeNull();
  });

  it('refuses a tampered ciphertext instead of throwing', async () => {
    const sealed = await sealSession(SESSION, SECRET);
    const tampered = `${sealed.slice(0, -4)}AAAA`;
    await expect(openSession(tampered, SECRET)).resolves.toBeNull();
  });

  it('refuses arbitrary garbage', async () => {
    await expect(openSession('not-a-jwe', SECRET)).resolves.toBeNull();
    await expect(openSession('', SECRET)).resolves.toBeNull();
  });
});

describe('sealAuthState / openAuthState', () => {
  it('round-trips the PKCE verifier and returnTo', async () => {
    const payload = {
      state: 'state-value',
      codeVerifier: 'pkce-code-verifier-value',
      returnTo: '/projects',
    };
    const sealed = await sealAuthState(payload, SECRET);
    expect(sealed).not.toContain('pkce-code-verifier-value');
    await expect(openAuthState(sealed, SECRET)).resolves.toEqual(payload);
  });

  it('refuses a state sealed with a different secret', async () => {
    const sealed = await sealAuthState({ state: 'st', codeVerifier: 'cv', returnTo: '/' }, SECRET);
    await expect(openAuthState(sealed, OTHER_SECRET)).resolves.toBeNull();
  });

  it('rejects a payload missing the verifier rather than returning a partial one', async () => {
    const sealed = await sealSession(SESSION, SECRET);
    await expect(openAuthState(sealed, SECRET)).resolves.toBeNull();
  });
});

describe('chunkCookieValue', () => {
  it('keeps a short value as a single chunk', () => {
    expect(chunkCookieValue('abc', 10)).toEqual(['abc']);
  });

  it('splits at exactly the chunk size', () => {
    expect(chunkCookieValue('abcdef', 2)).toEqual(['ab', 'cd', 'ef']);
  });

  it('yields one empty chunk for an empty value rather than none', () => {
    expect(chunkCookieValue('', 10)).toEqual(['']);
  });

  it('splits a real sealed session into cookie-sized pieces that rejoin exactly', async () => {
    const sealed = await sealSession(SESSION, SECRET);
    const chunks = chunkCookieValue(sealed);
    expect(chunks.every((chunk) => chunk.length <= MAX_COOKIE_CHUNK_LENGTH)).toBe(true);
    expect(chunks.join('')).toBe(sealed);
  });

  it('rejects a non-positive chunk size instead of looping forever', () => {
    expect(() => chunkCookieValue('abc', 0)).toThrow();
  });
});

describe('joinCookieChunks', () => {
  it('reassembles ordered chunks', () => {
    expect(
      joinCookieChunks({
        [chunkCookieName(0)]: 'ab',
        [chunkCookieName(1)]: 'cd',
      })
    ).toBe('abcd');
  });

  it('returns null when no chunk is present', () => {
    expect(joinCookieChunks({})).toBeNull();
    expect(joinCookieChunks({ [chunkCookieName(1)]: 'orphan' })).toBeNull();
  });

  it('stops at a gap rather than concatenating across the hole', () => {
    expect(
      joinCookieChunks({
        [chunkCookieName(0)]: 'ab',
        [chunkCookieName(2)]: 'ef',
      })
    ).toBe('ab');
  });

  it('ignores anything past the chunk ceiling', () => {
    const cookies: Record<string, string> = {};
    for (let index = 0; index <= MAX_COOKIE_CHUNKS; index += 1) {
      cookies[chunkCookieName(index)] = 'x';
    }
    expect(joinCookieChunks(cookies)).toHaveLength(MAX_COOKIE_CHUNKS);
  });

  it('round-trips a full sealed session through chunk and rejoin', async () => {
    const sealed = await sealSession(SESSION, SECRET);
    const cookies: Record<string, string> = {};
    chunkCookieValue(sealed).forEach((chunk, index) => {
      cookies[chunkCookieName(index)] = chunk;
    });
    const rejoined = joinCookieChunks(cookies);
    expect(rejoined).toBe(sealed);
    await expect(openSession(rejoined!, SECRET)).resolves.toEqual(SESSION);
  });
});

describe('sessionCookieAttributes', () => {
  it('is httpOnly, Secure, SameSite=Lax, site-wide', () => {
    expect(sessionCookieAttributes()).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    });
  });

  it('carries maxAge when one is given', () => {
    expect(sessionCookieAttributes(60).maxAge).toBe(60);
  });

  it('supports an explicit zero maxAge for clearing', () => {
    expect(sessionCookieAttributes(0).maxAge).toBe(0);
  });
});

describe('allSessionCookieNames', () => {
  it('covers every chunk slot so a shrinking session leaves no stale tail', () => {
    expect(allSessionCookieNames()).toHaveLength(MAX_COOKIE_CHUNKS);
    expect(allSessionCookieNames()[0]).toBe(chunkCookieName(0));
  });
});
