import { createRemoteJWKSet, jwtVerify } from 'jose';

import type { SessionClaims } from './claims';

export interface VerifyConfig {
  issuer: string;
  audience?: string;
  jwksUri?: string;
}

// One remote JWKS per URL, cached across invocations (jose handles key fetch + rotation).
const jwksByUri = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function remoteJwks(config: VerifyConfig) {
  const uri =
    config.jwksUri ?? `${config.issuer.replace(/\/+$/, '')}/protocol/openid-connect/certs`;
  let set = jwksByUri.get(uri);
  if (!set) {
    set = createRemoteJWKSet(new URL(uri));
    jwksByUri.set(uri, set);
  }
  return set;
}

/** Verify an RS256 access token. Returns the claims on success, or `null` if the token is
 *  missing, malformed, expired, or fails issuer/audience/signature checks. Edge-runtime safe. */
export async function verifyAccessToken(
  token: string,
  config: VerifyConfig
): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, remoteJwks(config), {
      issuer: config.issuer,
      audience: config.audience,
      algorithms: ['RS256'],
    });
    if (typeof payload.sub !== 'string') return null;
    return payload as unknown as SessionClaims;
  } catch {
    return null;
  }
}

export function verifyConfigFromEnv(): VerifyConfig {
  const issuer = process.env.OIDC_ISSUER;
  if (!issuer) throw new Error('OIDC_ISSUER must be set');
  return {
    issuer: issuer.replace(/\/+$/, ''),
    audience: process.env.OIDC_AUDIENCE,
    jwksUri: process.env.OIDC_JWKS_URI,
  };
}
