import { NextResponse, type NextRequest } from 'next/server';

import { publicOrigin, serverEnv } from '../../../server/env';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * OAuth 2.0 Protected Resource Metadata (RFC 9728) — ADR 0009 Decision 2's MCP-client discovery
 * hook. An MCP client (opencode, a ChatGPT connector, …) pointed at this console can read this
 * document to learn which authorization server issues tokens for it and how to present them.
 *
 * Deliberately minimal: it advertises facts this deployment actually knows (its own resource
 * identifier, the Keycloak issuer, bearer-in-header) and claims nothing else. It is unauthenticated
 * by design — RFC 9728 metadata is public — and exposes no secret: the issuer URL is already
 * visible in every authorize redirect.
 */
export async function GET(request: NextRequest) {
  const env = serverEnv();
  const origin = publicOrigin(request);

  return NextResponse.json(
    {
      resource: origin,
      authorization_servers: [env.keycloak.issuer],
      bearer_methods_supported: ['header'],
      scopes_supported: env.keycloak.scopes.split(' ').filter(Boolean),
      resource_documentation: `${origin}/`,
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=3600',
        'Content-Type': 'application/json',
      },
    }
  );
}
