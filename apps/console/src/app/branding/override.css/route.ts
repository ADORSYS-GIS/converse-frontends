import { readFileSync } from 'node:fs';

import { NextResponse } from 'next/server';

import { filterBrandingCss } from '../../../server/branding-css-filter';
import { serverEnv } from '../../../server/env';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * `GET /branding/override.css` — issue #368 (Phase H, runtime white-label branding). Serves the
 * operator-configured stylesheet (`config.yaml`'s `branding.style`) AFTER filtering it down to
 * daisyUI custom-property overrides only — `branding-css-filter.ts`'s own doc comment has the
 * exact contract. An operator typo in this file may recolor the console, but must never restructure
 * its layout: that is the whole reason the filter exists rather than a straight file passthrough.
 *
 * Exempted from the session-cookie gate (`middleware.ts`'s matcher), same as `/branding/logo`: the
 * root layout links this stylesheet unconditionally when `branding.style` is configured, and that
 * `<link>` is in the document before any session exists.
 *
 * 404, never 500: unconfigured (the default), or configured-but-missing-on-disk.
 */
export async function GET() {
  const stylePath = serverEnv().branding?.stylePath;
  if (!stylePath) {
    return new NextResponse(null, { status: 404 });
  }

  let raw: string;
  try {
    raw = readFileSync(stylePath, 'utf8');
  } catch {
    return new NextResponse(null, { status: 404 });
  }

  const { css, strippedSelectors, strippedDeclarations } = filterBrandingCss(raw);
  if (strippedSelectors.length > 0 || strippedDeclarations.length > 0) {
    // An operator misconfiguration, not an application bug -- logged so it shows up in the pod's
    // own logs, but the response stays a clean 200 with whatever DID pass the filter rather than
    // failing the whole stylesheet over one bad rule.
    console.warn(
      `[console] branding override.css (${stylePath}): stripped ${strippedSelectors.length} ` +
        `selector(s) and ${strippedDeclarations.length} declaration(s) outside the daisyUI ` +
        'custom-property contract (only :root/[data-theme="…"] blocks, custom properties only)',
      { strippedSelectors, strippedDeclarations }
    );
  }

  return new NextResponse(css, {
    status: 200,
    headers: {
      'Content-Type': 'text/css; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}
