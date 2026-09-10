import { readFileSync, statSync } from 'node:fs';

import { NextResponse, type NextRequest } from 'next/server';

import { brandingConfigFromEnv } from '../../../lib/server/branding';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * `GET /branding/logo-light` — the light-theme (`wireframe`) counterpart to `GET /branding/logo`.
 * Same streaming/ETag/404 contract, keyed off `LCI_BRANDING_LOGO_LIGHT_PATH` instead — see that
 * route's own doc comment for the full reasoning.
 */
export async function GET(request: NextRequest) {
  const branding = brandingConfigFromEnv();
  if (!branding.logoLightPath || !branding.logoLightContentType) {
    return new NextResponse(null, { status: 404 });
  }

  let stat: ReturnType<typeof statSync>;
  try {
    stat = statSync(branding.logoLightPath);
  } catch {
    return new NextResponse(null, { status: 404 });
  }

  const etag = `"${stat.mtimeMs.toString(16)}-${stat.size.toString(16)}"`;
  if (request.headers.get('if-none-match') === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag } });
  }

  let body: Buffer;
  try {
    body = readFileSync(branding.logoLightPath);
  } catch {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(new Uint8Array(body), {
    status: 200,
    headers: {
      'Content-Type': branding.logoLightContentType,
      ETag: etag,
      'Cache-Control': 'no-cache',
    },
  });
}
