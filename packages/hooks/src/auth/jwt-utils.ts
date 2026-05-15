/**
 * JWT Utility functions for decoding and validating JWT tokens
 * Specifically focused on audience (aud) claim validation
 */

/**
 * Decoded JWT token structure (standard claims)
 */
export type JwtPayload = {
  /** Issuer - identifies the token issuer */
  iss?: string;
  /** Subject - identifies the principal (user) */
  sub?: string;
  /** Audience - identifies the intended recipients (string or array) */
  aud?: string | string[];
  /** Expiration time (Unix timestamp) */
  exp?: number;
  /** Issued at time (Unix timestamp) */
  iat?: number;
  /** Not before time (Unix timestamp) */
  nbf?: number;
  /** JWT ID - unique identifier for the token */
  jti?: string;
  /** Any additional custom claims */
  [key: string]: unknown;
};

/**
 * Options for JWT validation
 */
export type JwtValidationOptions = {
  /** Expected audience(s) - token's aud claim must match at least one */
  expectedAudience?: string | string[];
  /** Whether to allow missing aud claim (default: false - aud is required) */
  allowMissingAudience?: boolean;
  /** Whether to check expiration (default: true) */
  checkExpiration?: boolean;
  /** Clock skew tolerance in seconds for expiration check (default: 60) */
  clockSkewSeconds?: number;
};

/**
 * Result of JWT validation
 */
export type JwtValidationResult = {
  /** Whether the token is valid */
  valid: boolean;
  /** Decoded payload if decoding was successful */
  payload?: JwtPayload;
  /** Validation errors if any */
  errors: string[];
};

/**
 * Decode a JWT token without verification
 * This extracts the payload claims for inspection
 * 
 * @param token - The JWT token string
 * @returns Decoded payload or null if decoding fails
 */
export function decodeJwt(token: string): JwtPayload | null {
  try {
    // JWT consists of three Base64URL-encoded parts: header.payload.signature
    const parts = token.split('.');
    
    if (parts.length !== 3) {
      console.warn('[JWT] Invalid token format: expected 3 parts');
      return null;
    }

    // Decode the payload (second part)
    const payloadBase64 = parts[1];
    
    // Convert Base64URL to Base64 if needed
    const base64 = payloadBase64
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    // Pad with '=' if needed
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    
    // Decode Base64 to string
    const payloadJson = atob(padded);
    
    // Parse JSON
    return JSON.parse(payloadJson) as JwtPayload;
  } catch (error) {
    console.warn('[JWT] Failed to decode token:', error);
    return null;
  }
}

/**
 * Base64URL decode for React Native environment
 * Falls back to standard atob for web, uses Buffer for native
 */
function atob(input: string): string {
  // Check if running in React Native
  if (typeof globalThis.atob === 'function') {
    return globalThis.atob(input);
  }
  
  // Fallback for environments without atob
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  
  for (let i = 0; i < input.length; i += 4) {
    const a = chars.indexOf(input.charAt(i));
    const b = chars.indexOf(input.charAt(i + 1));
    const c = chars.indexOf(input.charAt(i + 2));
    const d = chars.indexOf(input.charAt(i + 3));
    
    const bitmap = (a << 18) | (b << 12) | (c << 6) | d;
    
    output += String.fromCharCode(
      (bitmap >> 16) & 255,
      (bitmap >> 8) & 255,
      bitmap & 255
    );
  }
  
  // Remove padding characters
  return output.replace(/\0+$/, '');
}

/**
 * Check if an audience claim matches the expected audience(s)
 * 
 * @param tokenAudience - The audience from the token (string or array)
 * @param expectedAudience - Expected audience(s) to match
 * @returns True if there's at least one matching audience
 */
export function isAudienceValid(
  tokenAudience: string | string[] | undefined,
  expectedAudience: string | string[]
): boolean {
  if (!tokenAudience) {
    return false;
  }

  // Normalize both to arrays
  const tokenAudiences = Array.isArray(tokenAudience) ? tokenAudience : [tokenAudience];
  const expectedAudiences = Array.isArray(expectedAudience) ? expectedAudience : [expectedAudience];

  // Check for intersection
  return tokenAudiences.some(aud => expectedAudiences.includes(aud));
}

/**
 * Validate a JWT token's audience claim
 * 
 * @param token - The JWT token string
 * @param options - Validation options
 * @returns Validation result with payload and any errors
 */
export function validateJwtAudience(
  token: string,
  options: JwtValidationOptions = {}
): JwtValidationResult {
  const errors: string[] = [];
  const {
    expectedAudience,
    allowMissingAudience = false,
    checkExpiration = true,
    clockSkewSeconds = 60,
  } = options;

  // Decode the token
  const payload = decodeJwt(token);

  if (!payload) {
    errors.push('Failed to decode JWT token');
    return { valid: false, errors };
  }

  // Check expiration if enabled
  if (checkExpiration && payload.exp) {
    const now = Math.floor(Date.now() / 1000);
    const expirationWithSkew = payload.exp + clockSkewSeconds;
    
    if (now > expirationWithSkew) {
      errors.push(`Token expired at ${new Date(payload.exp * 1000).toISOString()}`);
    }
  }

  // Check audience if expected audience is configured
  if (expectedAudience) {
    if (!payload.aud) {
      if (!allowMissingAudience) {
        errors.push('Token missing required audience (aud) claim');
      }
    } else if (!isAudienceValid(payload.aud, expectedAudience)) {
      const expected = Array.isArray(expectedAudience) ? expectedAudience : [expectedAudience];
      const actual = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
      errors.push(
        `Token audience mismatch. Expected one of: ${expected.join(', ')}, ` +
        `got: ${actual.join(', ')}`
      );
    }
  }

  return {
    valid: errors.length === 0,
    payload,
    errors,
  };
}

/**
 * Extract the audience claim from a JWT token
 * 
 * @param token - The JWT token string
 * @returns The audience claim (as array for consistency) or null if not found/invalid
 */
export function getJwtAudience(token: string): string[] | null {
  const payload = decodeJwt(token);
  
  if (!payload?.aud) {
    return null;
  }

  return Array.isArray(payload.aud) ? payload.aud : [payload.aud];
}

/**
 * Check if a token is expired
 * 
 * @param token - The JWT token string
 * @param clockSkewSeconds - Clock skew tolerance in seconds (default: 60)
 * @returns True if token is expired or invalid
 */
export function isJwtExpired(token: string, clockSkewSeconds = 60): boolean {
  const payload = decodeJwt(token);
  
  if (!payload?.exp) {
    return true; // No expiration = consider expired for safety
  }

  const now = Math.floor(Date.now() / 1000);
  return now > (payload.exp + clockSkewSeconds);
}

/**
 * Get the subject (user ID) from a JWT token
 * 
 * @param token - The JWT token string
 * @returns The subject claim or null if not found
 */
export function getJwtSubject(token: string): string | null {
  const payload = decodeJwt(token);
  return payload?.sub ?? null;
}

/**
 * Get the issuer from a JWT token
 * 
 * @param token - The JWT token string
 * @returns The issuer claim or null if not found
 */
export function getJwtIssuer(token: string): string | null {
  const payload = decodeJwt(token);
  return payload?.iss ?? null;
}