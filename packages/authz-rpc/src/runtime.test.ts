import { createBatchLink } from '@cratestack/api';
import { describe, expect, it, vi } from 'vitest';

import { LightbridgeAuthzRpcClient } from '../generated/src/client';
import { CratestackRpcError } from '../generated/src/runtime';
import { JsonCodec, ensureCborCodecReady, getCborCodec } from './codec';
import { AuthzRpcRuntime } from './runtime';

// Mirrors cratestack-core::page::{Page, PageInfo} exactly (fixed in cratestack/cratestack#124 —
// the pre-0.4.11 generator had this wrong: hasNext/total/nextOffset don't exist on the wire).
const accountPage = {
  items: [
    {
      id: 'acc_01',
      defaultQuota: 't-m',
      status: 'active',
      createdAt: '2024-01-01T12:00:00Z',
      updatedAt: '2024-01-01T12:00:00Z',
    },
  ],
  totalCount: 1,
  pageInfo: { limit: 10, offset: 0, hasNextPage: false, hasPreviousPage: false },
};

const projectPage = {
  items: [
    {
      id: 'proj_01',
      accountId: 'acc_01',
      name: 'Test Project',
      billingPlan: 'free',
      status: 'active',
      isDefault: true,
      defaultLimits: {},
      account: { id: 'acc_01' },
      apiKeys: [],
      createdAt: '2024-01-01T12:00:00Z',
      updatedAt: '2024-01-01T12:00:00Z',
    },
  ],
  totalCount: 1,
  pageInfo: { limit: 10, offset: 0, hasNextPage: false, hasPreviousPage: false },
};

describe('AuthzRpcRuntime + generated client', () => {
  it('returns the corrected Page<Account> envelope through client.accounts.list()', async () => {
    const fetchFn = vi.fn(async (_url: string, init: RequestInit) => {
      expect((init.headers as Headers).get('content-type')).toBe('application/json');
      return new Response(JSON.stringify(accountPage), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    const authz = new AuthzRpcRuntime('https://api.example.com', {
      auth: async () => 'test-token',
      codec: JsonCodec,
      fetch: fetchFn as unknown as typeof fetch,
    });
    const client = new LightbridgeAuthzRpcClient(authz.runtime);

    const page = await client.accounts.list({ limit: 10, offset: 0 });

    expect(page.items).toHaveLength(1);
    expect(page.items[0].defaultQuota).toBe('t-m');
    expect(page.totalCount).toBe(1);
    expect(page.pageInfo.hasNextPage).toBe(false);
    expect(page.pageInfo.hasPreviousPage).toBe(false);
    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.example.com/api/rpc/model.Account.list',
      expect.anything()
    );
  });

  it('round-trips through the CBOR codec end to end', async () => {
    await ensureCborCodecReady();
    const cborCodec = getCborCodec();
    const fetchFn = vi.fn(async (_url: string, init: RequestInit) => {
      expect((init.headers as Headers).get('content-type')).toBe('application/cbor');
      // Echo the request back through the same codec, proving the runtime both encodes
      // and decodes CBOR correctly, not just JSON.
      const decodedRequest = cborCodec.decode(new Uint8Array(init.body as ArrayBuffer));
      expect(decodedRequest).toEqual({ limit: 10, offset: 0 });
      return new Response(cborCodec.encode(accountPage) as BodyInit, {
        status: 200,
        headers: { 'content-type': 'application/cbor' },
      });
    });

    const authz = new AuthzRpcRuntime('https://api.example.com', {
      auth: async () => 'test-token',
      codec: cborCodec,
      fetch: fetchFn as unknown as typeof fetch,
    });
    const client = new LightbridgeAuthzRpcClient(authz.runtime);

    const page = await client.accounts.list({ limit: 10, offset: 0 });
    expect(page.items[0].id).toBe('acc_01');
  });

  it('retries once after a 401, using the refreshed token', async () => {
    let callCount = 0;
    const fetchFn = vi.fn(async (_url: string, init: RequestInit) => {
      callCount += 1;
      const auth = (init.headers as Headers).get('authorization');
      if (callCount === 1) {
        expect(auth).toBe('Bearer stale-token');
        return new Response(JSON.stringify({ code: 'unauthenticated', message: 'expired' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        });
      }
      expect(auth).toBe('Bearer fresh-token');
      return new Response(JSON.stringify(accountPage), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    let token = 'stale-token';
    const refreshAuth = vi.fn(async () => {
      token = 'fresh-token';
      return true;
    });

    const authz = new AuthzRpcRuntime('https://api.example.com', {
      auth: async () => token,
      refreshAuth,
      codec: JsonCodec,
      fetch: fetchFn as unknown as typeof fetch,
    });
    const client = new LightbridgeAuthzRpcClient(authz.runtime);

    const page = await client.accounts.list({});

    expect(refreshAuth).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(page.items).toHaveLength(1);
  });
});

// `AuthzRpcRuntime` always encodes request bodies through our `Codec` (JSON here), which returns
// a `Uint8Array`, not a string — decode it the same way the runtime's own `readErrorBody`/
// `readUnaryResponse` do before parsing as JSON.
function decodeBatchRequestBody(body: BodyInit | null | undefined): { id: number; op: string }[] {
  return JSON.parse(new TextDecoder().decode(body as Uint8Array)) as { id: number; op: string }[];
}

// Proves `AuthzRpcRuntime`'s `links` passthrough (ticket #119) actually activates
// `@cratestack/api`'s `createBatchLink()` correctly end to end — this link is not yet wired into
// the app root (see ticket #120), so this is the only place it's exercised today.
describe('AuthzRpcRuntime with createBatchLink()', () => {
  it('collapses two concurrent calls issued in the same tick into one POST /rpc/batch request', async () => {
    const fetchFn = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe('https://api.example.com/api/rpc/batch');
      const requests = decodeBatchRequestBody(init.body);
      const frames = requests.map((request) => ({
        id: request.id,
        output: request.op === 'model.Account.list' ? accountPage : projectPage,
      }));
      return new Response(JSON.stringify(frames), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    const authz = new AuthzRpcRuntime('https://api.example.com', {
      auth: async () => 'test-token',
      codec: JsonCodec,
      fetch: fetchFn as unknown as typeof fetch,
      links: [createBatchLink()],
    });
    const client = new LightbridgeAuthzRpcClient(authz.runtime);

    const [accounts, projects] = await Promise.all([
      client.accounts.list({ limit: 10, offset: 0 }),
      client.projects.list({ limit: 10, offset: 0 }),
    ]);

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(accounts.items[0].defaultQuota).toBe('t-m');
    expect(projects.items[0].name).toBe('Test Project');
  });

  it('fails only the errored frame, leaving the rest of the same batch unaffected', async () => {
    const fetchFn = vi.fn(async (_url: string, init: RequestInit) => {
      const requests = decodeBatchRequestBody(init.body);
      const frames = requests.map((request) =>
        request.op === 'model.Project.list'
          ? { id: request.id, error: { code: 'not_found', message: 'no such project' } }
          : { id: request.id, output: accountPage }
      );
      return new Response(JSON.stringify(frames), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    const authz = new AuthzRpcRuntime('https://api.example.com', {
      auth: async () => 'test-token',
      codec: JsonCodec,
      fetch: fetchFn as unknown as typeof fetch,
      links: [createBatchLink()],
    });
    const client = new LightbridgeAuthzRpcClient(authz.runtime);

    const [accountsResult, projectsResult] = await Promise.allSettled([
      client.accounts.list({ limit: 10, offset: 0 }),
      client.projects.list({ limit: 10, offset: 0 }),
    ]);

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(accountsResult.status).toBe('fulfilled');
    expect(projectsResult.status).toBe('rejected');
    if (projectsResult.status === 'rejected') {
      expect(projectsResult.reason).toBeInstanceOf(CratestackRpcError);
      expect((projectsResult.reason as CratestackRpcError).code).toBe('not_found');
    }
  });

  it('still wraps a call issued in isolation as a one-frame /rpc/batch request', async () => {
    const fetchFn = vi.fn(async (url: string, init: RequestInit) => {
      // `createBatchLink()` unconditionally routes every unary call through `/rpc/batch` once
      // its scheduling window flushes — there is no size-1 special case that falls back to a
      // plain `/rpc/{op_id}` request. Collapsing only happens incidentally, when 2+ calls share
      // a window; a lone call still pays the one-frame batch envelope.
      expect(url).toBe('https://api.example.com/api/rpc/batch');
      const requests = decodeBatchRequestBody(init.body);
      expect(requests).toHaveLength(1);
      expect(requests[0].op).toBe('model.Account.list');
      return new Response(JSON.stringify([{ id: requests[0].id, output: accountPage }]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    const authz = new AuthzRpcRuntime('https://api.example.com', {
      auth: async () => 'test-token',
      codec: JsonCodec,
      fetch: fetchFn as unknown as typeof fetch,
      links: [createBatchLink()],
    });
    const client = new LightbridgeAuthzRpcClient(authz.runtime);

    const page = await client.accounts.list({ limit: 10, offset: 0 });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(page.items[0].defaultQuota).toBe('t-m');
  });
});
