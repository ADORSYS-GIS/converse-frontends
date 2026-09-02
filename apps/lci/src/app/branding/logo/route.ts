import { readFileSync, statSync } from 'node:fs';

import { NextResponse, type NextRequest } from 'next/server';

import { brandingConfigFromEnv } from '../../../lib/server/branding';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * `GET /branding/logo` — streams the operator-configured logo file
 * (`LCI_BRANDING_LOGO_PATH`, a host-absolute path a real deployment mounts from a ConfigMap
 * volume — see `charts/converse-lci`'s own `branding` values block) with an `ETag`/304 pair, so a
 * browser that already has the current file never re-downloads it on every navigation.
 *
 * Exempted from the session-cookie gate (`proxy.ts`'s matcher) — the brand mark it backs
 * (`client/lci-chrome.tsx`'s `LciBrandMark`) renders in chrome that must be visible before, and
 * without, a session.
 *
 * 404, never 500, on every "nothing to serve" case — unconfigured (the default) and
 * configured-but-missing-on-disk alike (a ConfigMap volume mount race on pod start, or an
 * operator pointing the env var at the wrong path) — a broken mount must degrade to this app's
 * built-in mark, not take the whole shell down.
 */
export async function GET(request: NextRequest) {
  const branding = brandingConfigFromEnv();
  if (!branding.logoPath || !branding.logoContentType) {
    return new NextResponse(null, { status: 404 });
  }

  let stat: ReturnType<typeof statSync>;
  try {
    stat = statSync(branding.logoPath);
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
    body = readFileSync(branding.logoPath);
  } catch {
    // Passed `statSync` a moment ago but vanished before `readFileSync` — the same mount-race
    // window `statSync`'s own catch above covers, just on the other side of it.
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(new Uint8Array(body), {
    status: 200,
    headers: {
      'Content-Type': branding.logoContentType,
      ETag: etag,
      // Always revalidate (a redeployed logo must show up promptly on the next paint) rather
      // than a long max-age — the ETag/304 pair above is what actually saves the bytes.
      'Cache-Control': 'no-cache',
    },
  });
}
