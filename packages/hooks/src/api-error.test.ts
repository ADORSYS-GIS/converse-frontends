import { describe, expect, it, vi } from 'vitest';

// This file exercises real error instances, not hand-rolled mocks — `@lightbridge/authz-rpc`'s
// `getAuthzRpcClient`/`createId` still need stubbing (constructing a real client has side
// effects this file doesn't want), but `importOriginal` keeps every other export -- including
// `CratestackRpcError`/`CratestackRpcTransportError` -- wired to the real generated class. Same
// spirit as `budget.test.ts`'s mock of this module, minus discarding the error classes.
vi.mock('@lightbridge/authz-rpc', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@lightbridge/authz-rpc')>();
  return {
    ...actual,
    getAuthzRpcClient: () => ({}),
    createId: () => 'test-id',
  };
});

import { CratestackRpcError, CratestackRpcTransportError } from '@lightbridge/authz-rpc';
import { getApiErrorMessage, getApiErrorStatus, isPermissionDeniedError } from './api-error';

describe('getApiErrorStatus / isPermissionDeniedError', () => {
  it('reads .status directly off a real CratestackRpcError (a 403 permission denial)', () => {
    const error = new CratestackRpcError(403, {
      code: 'permission_denied',
      message: 'Forbidden: missing required permission: budget:self-refill',
    });
    expect(getApiErrorStatus(error)).toBe(403);
    expect(isPermissionDeniedError(error)).toBe(true);
  });

  it('treats a non-403 status as not permission-denied', () => {
    const error = new CratestackRpcError(500, { code: 'internal', message: 'boom' });
    expect(getApiErrorStatus(error)).toBe(500);
    expect(isPermissionDeniedError(error)).toBe(false);
  });

  it('returns undefined for a transport-level failure with no HTTP status at all', () => {
    // CratestackRpcTransportError is thrown for a network failure / malformed response, before
    // any status is ever known — see packages/authz-rpc/generated/src/runtime.ts.
    const error = new CratestackRpcTransportError('Failed to fetch');
    expect(getApiErrorStatus(error)).toBeUndefined();
    expect(isPermissionDeniedError(error)).toBe(false);
  });

  it('returns undefined for a plain non-RPC error', () => {
    expect(getApiErrorStatus(new Error('network down'))).toBeUndefined();
    expect(isPermissionDeniedError(new Error('network down'))).toBe(false);
  });

  it('does NOT match the legacy Axios shape (this app has no Axios client left)', () => {
    // packages/api-rest is generated but has zero importers anywhere in the repo -- there is no
    // live code path that can ever throw this shape. Asserted here so a future re-introduction
    // of an Axios-based client doesn't silently regress back to `undefined` for every RPC error.
    const axiosShapedError = { response: { status: 403, data: 'Forbidden' } };
    expect(getApiErrorStatus(axiosShapedError)).toBeUndefined();
  });
});

describe('getApiErrorMessage', () => {
  it("surfaces a real CratestackRpcError's decoded body message verbatim", () => {
    const error = new CratestackRpcError(409, {
      code: 'conflict',
      message: 'An API key with this name already exists.',
    });
    expect(getApiErrorMessage(error)).toBe('An API key with this name already exists.');
  });

  it("replaces readErrorBody's own placeholder text with a generic message instead of leaking it", () => {
    // Mirrors what `readErrorBody` (packages/authz-rpc/generated/src/runtime.ts) actually
    // constructs when a handler's body doesn't match cratestack's own `{code, message}` shape --
    // e.g. the RBAC gate's `{error: "..."}` on a 403. This exact string is not something a user
    // should ever see.
    const error = new CratestackRpcError(403, {
      code: 'internal',
      message: 'RPC call returned status 403 with an unrecognized error body',
    });
    const message = getApiErrorMessage(error);
    expect(message).not.toMatch(/unrecognized error body/i);
    expect(message).not.toMatch(/^RPC call returned status/);
    expect(message).toBe('Something went wrong. Please try again.');
  });

  it('falls back to .message for a transport-level failure (no server-decoded body exists)', () => {
    const error = new CratestackRpcTransportError('Failed to fetch');
    expect(getApiErrorMessage(error)).toBe('Failed to fetch');
  });

  it('falls back to .message for a plain, non-RPC Error', () => {
    expect(getApiErrorMessage(new Error('network down'))).toBe('network down');
  });

  it('falls back to String(error) for a non-object thrown value', () => {
    expect(getApiErrorMessage('just a string')).toBe('just a string');
    expect(getApiErrorMessage(null)).toBe('null');
  });

  // --- cratestack 0.11.0 (cratestack/cratestack#869) -----------------------------------------
  // Before this bump, everything in this block arrived as an undecodable `text/plain` body and
  // was flattened to GENERIC_ERROR_MESSAGE. Now the middleware emits a real typed envelope, so
  // `body.message` is a genuine string -- and it is a string written for an operator's log. These
  // assertions are what stops it reaching a user.

  it('replaces a 429 throttle with our own copy, not the wire message', () => {
    // Exactly what `RateLimitLayer` puts on the wire for the RPC binding: gRPC-style lowercase
    // `resource_exhausted`, message "rate limit exceeded". Verified against cratestack-axum
    // 0.11.0's e2e_ratelimit CBOR dump in cratestack/cratestack#869.
    const error = new CratestackRpcError(429, {
      code: 'resource_exhausted',
      message: 'rate limit exceeded',
    });
    const message = getApiErrorMessage(error);
    expect(message).toBe('Too many requests. Please wait a moment and try again.');
    expect(message).not.toBe('rate limit exceeded');
  });

  it('never leaks "rate limit store" to a user when the limiter refuses fail-closed', () => {
    // lightbridge-authz pins StoreErrorPolicy::Deny, so a Redis outage refuses with 503 and
    // `cratestack-redis`'s STORE_UNAVAILABLE_MESSAGE verbatim. That names an internal component
    // the user cannot act on -- the whole reason INFRASTRUCTURE_CODE_MESSAGES exists.
    const error = new CratestackRpcError(503, {
      code: 'unavailable',
      message: 'rate limit store temporarily unavailable',
    });
    const message = getApiErrorMessage(error);
    expect(message).toBe('The service is temporarily unavailable. Please try again in a moment.');
    expect(message).not.toMatch(/rate limit store/i);
  });

  it('covers the store-timeout wording too, since the code is what is matched, not the text', () => {
    const error = new CratestackRpcError(503, {
      code: 'unavailable',
      message: 'rate limit store timed out',
    });
    expect(getApiErrorMessage(error)).toBe(
      'The service is temporarily unavailable. Please try again in a moment.'
    );
  });

  it('leaves every non-infrastructure code alone, including other 4xx the user can act on', () => {
    // The override is deliberately narrow: a handler's own message is written for whoever made
    // the call and must survive verbatim. A regression that widened the map would fail here.
    for (const [status, code, message] of [
      [403, 'permission_denied', 'Forbidden: missing required permission: budget:self-refill'],
      [404, 'not_found', 'No project with that id.'],
      [400, 'invalid_argument', 'name must be at least 3 characters.'],
      [409, 'conflict', 'An API key with this name already exists.'],
    ] as const) {
      const error = new CratestackRpcError(status, { code, message });
      expect(getApiErrorMessage(error)).toBe(message);
    }
  });

  it('still falls back to the generic message when an infrastructure code has no body message', () => {
    // `readErrorBody` synthesizes `{code: "internal", ...}` for an empty body, so an `unavailable`
    // with a placeholder message can only come from a real envelope -- but the code arm wins
    // either way, which is the point of consulting it first.
    const error = new CratestackRpcError(500, {
      code: 'internal',
      message: 'RPC call returned status 500 with an undecodable error body',
    });
    expect(getApiErrorMessage(error)).toBe('Something went wrong. Please try again.');
  });

  it('does NOT read the legacy Axios .response.data shape (this app has no Axios client left)', () => {
    const axiosShapedError = {
      response: { data: 'Forbidden: missing permission' },
      message: 'Request failed',
    };
    // No `.body`, so this falls through to the generic `.message` branch rather than the
    // Axios-specific `.response.data` a pre-migration caller might expect.
    expect(getApiErrorMessage(axiosShapedError)).toBe('Request failed');
  });
});
