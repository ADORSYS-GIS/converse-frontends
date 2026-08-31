import { readFileSync, statSync } from 'node:fs';

import { NextResponse, type NextRequest } from 'next/server';

import { serverEnv } from '../../../server/env';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * `GET /branding/logo-light` — per-theme logos addendum to issue #368 (Phase H, runtime
 * white-label branding), owner directive 2026-08-31 ("White is for dark themes"). Streams the
 * operator-configured light-theme logo file (`config.yaml`'s `branding.logoLight`, a
 * host-absolute path a real deployment mounts from a ConfigMap volume — see
 * `charts/converse-console`'s own `branding` values block) with an `ETag`/304 pair, identical
 * mechanics to `../logo/route.ts`'s `GET /branding/logo` — see that route's own doc comment for
 * why (revalidate-always, mtime+size ETag, 404-never-500).
 *
 * Exempted from the session-cookie gate the same way `/branding/logo` is: `middleware.ts`'s
 * matcher excludes the whole `branding/` prefix, not this route individually — the brand mark it
 * backs (`client/console-chrome.tsx`'s `BrandMark`) renders in chrome that must be visible before,
 * and without, a session.
 *
 * 404, never 500, on every "nothing to serve" case — unconfigured (the default; also every
 * deployment that only sets `branding.logo` and never opts into a light-theme counterpart) and
 * configured-but-missing-on-disk alike.
 */
export async function GET(request: NextRequest) {
  const branding = serverEnv().branding;
  if (!branding?.logoLightPath || !branding.logoLightContentType) {
    return new NextResponse(null, { status: 404 });
  }

  let stat: ReturnType<typeof statSync>;
  try {
    stat = statSync(branding.logoLightPath);
  } catch {
    return new NextResponse(null, { status: 404 });
  }

  // mtime + size, not a content hash: cheap enough to compute on every request (no caching of our
  // own needed) and still changes whenever the mounted file actually does.
  const etag = `"${stat.mtimeMs.toString(16)}-${stat.size.toString(16)}"`;
  if (request.headers.get('if-none-match') === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag } });
  }

  let body: Buffer;
  try {
    body = readFileSync(branding.logoLightPath);
  } catch {
    // Passed `statSync` a moment ago but vanished before `readFileSync` -- the same mount-race
    // window `statSync`'s own catch above covers, just on the other side of it.
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(new Uint8Array(body), {
    status: 200,
    headers: {
      'Content-Type': branding.logoLightContentType,
      ETag: etag,
      // Always revalidate (a redeployed logo must show up promptly on the next paint) rather
      // than a long max-age -- the ETag/304 pair above is what actually saves the bytes.
      'Cache-Control': 'no-cache',
    },
  });
}
