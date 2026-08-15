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
