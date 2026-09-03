import { describe, expect, it, vi } from 'vitest';

import {
  MAX_COOKIE_CHUNKS,
  MAX_COOKIE_CHUNK_LENGTH,
  SessionTooLargeError,
  allSessionCookieNames,
  chunkCookieName,
  chunkCookieValue,
  chunkSealedSession,
  deriveSessionKey,
  joinCookieChunks,
  openAuthState,
  openSession,
  openSessionWithSecretIndex,
  sealAuthState,
  sealExpirySeconds,
  sealSession,
  sealingSecret,
  sessionCookieAttributes,
  type ConsoleSession,
  type SessionTtl,
} from './session';

const SECRET = 'a'.repeat(48);
const OTHER_SECRET = 'b'.repeat(48);
const THIRD_SECRET = 'c'.repeat(48);

/** 12 h sliding / 7 d absolute — the shipped `config.yaml` defaults. */
const TTL: SessionTtl = { maxAgeSeconds: 12 * 60 * 60, absoluteMaxAgeSeconds: 7 * 24 * 60 * 60 };

const NOW = 1_700_000_000_000;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const SESSION: ConsoleSession = {
  sid: 'sid-1',
  startedAt: NOW,
  tokens: {
    accessToken: 'header.payload.signature',
    refreshToken: 'refresh-token',
    idToken: 'id-token',
    expiresAt: 1_700_000_060_000,
    audience: ['lightbridge-api-key'],
  },
  user: {
    sub: 'user-1',
    platformUserId: 'person-1',
    name: 'Ada Lovelace',
    preferredUsername: 'ada',
    email: 'ada@example.test',
    roles: ['lightbridge-admin'],
    permissions: ['usage:read-all', 'rbac:manage'],
    accessVerified: true,
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
    const sealed = await sealSession(SESSION, SECRET, TTL, NOW);
    await expect(openSession(sealed, SECRET, TTL, NOW)).resolves.toEqual(SESSION);
  });

  it('produces ciphertext that carries no token in the clear', async () => {
    const sealed = await sealSession(SESSION, SECRET, TTL, NOW);
    expect(sealed).not.toContain('refresh-token');
    expect(sealed).not.toContain('id-token');
    expect(sealed).not.toContain('ada@example.test');
  });

  it('refuses a session sealed with a different secret', async () => {
    const sealed = await sealSession(SESSION, SECRET, TTL, NOW);
    await expect(openSession(sealed, OTHER_SECRET, TTL, NOW)).resolves.toBeNull();
  });

  it('refuses a tampered ciphertext instead of throwing', async () => {
    const sealed = await sealSession(SESSION, SECRET, TTL, NOW);
    const tampered = `${sealed.slice(0, -4)}AAAA`;
    await expect(openSession(tampered, SECRET, TTL, NOW)).resolves.toBeNull();
  });

  it('refuses arbitrary garbage', async () => {
    await expect(openSession('not-a-jwe', SECRET, TTL, NOW)).resolves.toBeNull();
    await expect(openSession('', SECRET, TTL, NOW)).resolves.toBeNull();
  });
});

describe('seal expiry (ADR 0016, D3.1)', () => {
  it('stamps exp at now + maxAgeSeconds when the absolute cap is far away', () => {
    expect(sealExpirySeconds(NOW, TTL, NOW)).toBe(Math.floor(NOW / 1000) + TTL.maxAgeSeconds);
  });

  it('clamps exp to startedAt + absoluteMaxAgeSeconds near the cap', () => {
    // 6 days 20 h into a 7-day-capped session: the 12 h sliding window would overshoot the cap.
    const now = NOW + 6 * DAY_MS + 20 * HOUR_MS;
    expect(sealExpirySeconds(NOW, TTL, now)).toBe(
      Math.floor(NOW / 1000) + TTL.absoluteMaxAgeSeconds
    );
  });

  it('refuses a seal whose exp has passed', async () => {
    const sealed = await sealSession(SESSION, SECRET, TTL, NOW);
    // One second past the 12 h window AND past the 30 s clock tolerance.
    const wellPast = NOW + (TTL.maxAgeSeconds + 31) * 1000;
    await expect(openSession(sealed, SECRET, TTL, wellPast)).resolves.toBeNull();
  });

  it('still opens inside the 30-second clock tolerance', async () => {
    const sealed = await sealSession(SESSION, SECRET, TTL, NOW);
    const justPast = NOW + (TTL.maxAgeSeconds + 5) * 1000;
    await expect(openSession(sealed, SECRET, TTL, justPast)).resolves.toEqual(SESSION);
  });

  it('refuses a seal that carries no exp at all — every pre-ADR-0016 cookie', async () => {
    // What the old `sealSession` produced: setIssuedAt() and nothing else. Built with the same
    // primitives rather than mocked, so this is the actual wire shape being refused.
    const { EncryptJWT } = await import('jose');
    const legacy = await new EncryptJWT({ session: SESSION })
      .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
      .setIssuedAt(Math.floor(NOW / 1000))
      .encrypt(deriveSessionKey(SECRET));
    await expect(openSession(legacy, SECRET, TTL, NOW)).resolves.toBeNull();
  });

  it('slides: re-sealing an in-use session pushes exp out', async () => {
    const first = sealExpirySeconds(SESSION.startedAt, TTL, NOW);
    const later = NOW + 10 * HOUR_MS;
    const second = sealExpirySeconds(SESSION.startedAt, TTL, later);
    expect(second).toBeGreaterThan(first);

    // And the re-sealed cookie genuinely outlives the original window.
    const resealed = await sealSession(SESSION, SECRET, TTL, later);
    const pastOriginalWindow = NOW + (TTL.maxAgeSeconds + 3600) * 1000;
    await expect(openSession(resealed, SECRET, TTL, pastOriginalWindow)).resolves.toEqual(SESSION);
  });

  it('caps the slide: a session past absoluteMaxAgeSeconds is refused however recently sealed', async () => {
    const pastCap = NOW + TTL.absoluteMaxAgeSeconds * 1000 + 1000;
    // Sealed at `pastCap` — the freshest possible seal — yet the ORIGINAL startedAt is beyond the
    // cap, so both the clamped `exp` and the explicit absolute check refuse it.
    const sealed = await sealSession(SESSION, SECRET, TTL, pastCap);
    await expect(openSession(sealed, SECRET, TTL, pastCap)).resolves.toBeNull();
  });

  it('refuses a still-unexpired seal once absoluteMaxAgeSeconds is lowered under it', async () => {
    const sealed = await sealSession(SESSION, SECRET, TTL, NOW);
    const tightened: SessionTtl = { maxAgeSeconds: 60, absoluteMaxAgeSeconds: 60 };
    // `exp` is hours away, but the session started an hour ago and the cap is now one minute.
    await expect(openSession(sealed, SECRET, tightened, NOW + HOUR_MS)).resolves.toBeNull();
  });

  it('refuses a payload with no startedAt rather than defaulting it to now', async () => {
    const { EncryptJWT } = await import('jose');
    const { startedAt: _dropped, ...withoutStartedAt } = SESSION;
    const sealed = await new EncryptJWT({ session: withoutStartedAt })
      .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
      .setIssuedAt(Math.floor(NOW / 1000))
      .setExpirationTime(Math.floor(NOW / 1000) + TTL.maxAgeSeconds)
      .encrypt(deriveSessionKey(SECRET));
    await expect(openSession(sealed, SECRET, TTL, NOW)).resolves.toBeNull();
  });
});

describe('secret rotation (ADR 0016, D3.2)', () => {
  it('seals with the first secret of a list', () => {
    expect(sealingSecret([SECRET, OTHER_SECRET])).toBe(SECRET);
    expect(sealingSecret(SECRET)).toBe(SECRET);
  });

  it('throws rather than sealing under nothing when the list is empty', () => {
    expect(() => sealingSecret([])).toThrow(/empty list/);
  });

  it('opens a seal made with A when the list is [B, A] — the middle of a rotation', async () => {
    const sealed = await sealSession(SESSION, SECRET, TTL, NOW);
    await expect(openSession(sealed, [OTHER_SECRET, SECRET], TTL, NOW)).resolves.toEqual(SESSION);
  });

  it('refuses that same seal once A is dropped and only [B] remains', async () => {
    const sealed = await sealSession(SESSION, SECRET, TTL, NOW);
    await expect(openSession(sealed, [OTHER_SECRET], TTL, NOW)).resolves.toBeNull();
  });

  it('reports which secret opened it, so an operator can tell when a rotation is done', async () => {
    const underOld = await sealSession(SESSION, THIRD_SECRET, TTL, NOW);
    const underNew = await sealSession(SESSION, SECRET, TTL, NOW);
    const secrets = [SECRET, OTHER_SECRET, THIRD_SECRET];

    await expect(openSessionWithSecretIndex(underNew, secrets, TTL, NOW)).resolves.toMatchObject({
      secretIndex: 0,
    });
    await expect(openSessionWithSecretIndex(underOld, secrets, TTL, NOW)).resolves.toMatchObject({
      secretIndex: 2,
    });
    await expect(openSessionWithSecretIndex('not-a-jwe', secrets, TTL, NOW)).resolves.toBeNull();
  });

  it('logs the opening secret index at debug level', async () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
    try {
      const sealed = await sealSession(SESSION, THIRD_SECRET, TTL, NOW);
      await openSession(sealed, [SECRET, THIRD_SECRET], TTL, NOW);
      expect(debug).toHaveBeenCalledWith(expect.stringContaining('session.secret[1]'));
    } finally {
      debug.mockRestore();
    }
  });

  it('opens an auth-state cookie sealed under a retired secret too', async () => {
    const payload = { state: 'st', codeVerifier: 'cv', returnTo: '/' };
    const sealed = await sealAuthState(payload, OTHER_SECRET);
    await expect(openAuthState(sealed, [SECRET, OTHER_SECRET])).resolves.toEqual(payload);
    await expect(openAuthState(sealed, [SECRET])).resolves.toBeNull();
  });
});

describe('sealAuthState / openAuthState', () => {
  it('round-trips the PKCE verifier and returnTo', async () => {
    const payload = {
      state: 'state-value',
      codeVerifier: 'pkce-code-verifier-value',
      returnTo: '/accounts/acct_1/projects',
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
    const sealed = await sealSession(SESSION, SECRET, TTL, NOW);
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
    const sealed = await sealSession(SESSION, SECRET, TTL, NOW);
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
    const sealed = await sealSession(SESSION, SECRET, TTL, NOW);
    const cookies: Record<string, string> = {};
    chunkCookieValue(sealed).forEach((chunk, index) => {
      cookies[chunkCookieName(index)] = chunk;
    });
    const rejoined = joinCookieChunks(cookies);
    expect(rejoined).toBe(sealed);
    await expect(openSession(rejoined!, SECRET, TTL, NOW)).resolves.toEqual(SESSION);
  });
});

describe('chunkSealedSession — the ceiling (ADR 0016, D4)', () => {
  it('caps the cookie budget at 2 chunks, the measured production shape', () => {
    expect(MAX_COOKIE_CHUNKS).toBe(2);
  });

  it('passes through a real sealed session, which fits in two chunks', async () => {
    const sealed = await sealSession(SESSION, SECRET, TTL, NOW);
    const chunks = chunkSealedSession(sealed);
    expect(chunks.length).toBeLessThanOrEqual(MAX_COOKIE_CHUNKS);
    expect(chunks.join('')).toBe(sealed);
  });

  it('refuses loudly rather than writing slots nothing reads back', () => {
    const oversized = 'x'.repeat(MAX_COOKIE_CHUNKS * MAX_COOKIE_CHUNK_LENGTH + 1);
    expect(() => chunkSealedSession(oversized)).toThrow(SessionTooLargeError);
    // The message has to name the numbers: the failure an operator would otherwise see is a 400
    // from the ingress or a 431 from Node, neither of which mentions a cookie.
    expect(() => chunkSealedSession(oversized)).toThrow(/MAX_COOKIE_CHUNKS is 2/);
    expect(() => chunkSealedSession(oversized)).toThrow(new RegExp(`${oversized.length} bytes`));
  });

  it('accepts a value sitting exactly on the ceiling', () => {
    const exact = 'x'.repeat(MAX_COOKIE_CHUNKS * MAX_COOKIE_CHUNK_LENGTH);
    expect(chunkSealedSession(exact)).toHaveLength(MAX_COOKIE_CHUNKS);
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
