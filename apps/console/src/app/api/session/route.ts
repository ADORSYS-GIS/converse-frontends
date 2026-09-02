import { NextResponse, type NextRequest } from 'next/server';

import { readSessionFromRequest } from '../../../server/session-store';
import { ANONYMOUS_SESSION, type SessionResponse } from '../../../shared/session-response';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * The client shell's identity endpoint: who is signed in, and what the backend says they may do.
 *
 * Returns the sanitized user **only** — `sub`, `name`, `preferredUsername`, `email`, `roles` —
 * beside the permission set `getMyAccess` resolved server-side at login/refresh. No
 * access token, no refresh token, no id token, no expiry. That exclusion is the whole point of
 * ADR 0009 Decision 2, so the body is built field-by-field from the session rather than by
 * spreading it, which would leak a token the day someone adds one to `SessionUser`.
 */
export async function GET(request: NextRequest) {
  const session = await readSessionFromRequest(request);

  const body: SessionResponse = session
    ? {
        authenticated: true,
        user: {
          sub: session.user.sub,
          platformUserId: session.user.platformUserId,
          name: session.user.name,
          preferredUsername: session.user.preferredUsername,
          email: session.user.email,
          roles: session.user.roles,
        },
        permissions: session.user.permissions,
        accessVerified: session.user.accessVerified,
      }
    : ANONYMOUS_SESSION;

  return NextResponse.json(body, {
    status: session ? 200 : 401,
    headers: { 'Cache-Control': 'no-store' },
  });
}
