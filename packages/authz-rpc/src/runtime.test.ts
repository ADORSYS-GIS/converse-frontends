import { describe, expect, it, vi } from 'vitest';

import { LightbridgeAuthzRpcClient } from '../generated/src/client';
import { CborCodec, JsonCodec } from './codec';
import { AuthzRpcRuntime } from './runtime';

const accountPage = {
  items: [
    {
      id: 'acc_01',
      billingIdentity: 'corp-identity-001',
      status: 'active',
      createdAt: '2024-01-01T12:00:00Z',
      updatedAt: '2024-01-01T12:00:00Z',
    },
  ],
  pageInfo: { limit: 10, offset: 0, hasNext: false, nextOffset: null, total: 1 },
};

describe('AuthzRpcRuntime + generated client', () => {
  it('unwraps the @@paged Page<Account> envelope through client.accounts.list()', async () => {
    const fetchFn = vi.fn(async (_url: string, init: RequestInit) => {
      expect((init.headers as Headers).get('content-type')).toBe('application/json');
      return new Response(JSON.stringify(accountPage), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    const runtime = new AuthzRpcRuntime('https://api.example.com', {
      auth: async () => 'test-token',
      codec: JsonCodec,
      fetch: fetchFn as unknown as typeof fetch,
    });
    const client = new LightbridgeAuthzRpcClient(runtime);

    const page = await client.accounts.list({ limit: 10, offset: 0 });

    expect(page.items).toHaveLength(1);
    expect(page.items[0].billingIdentity).toBe('corp-identity-001');
    expect(page.pageInfo?.total).toBe(1);
    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.example.com/api/rpc/model.Account.list',
      expect.anything()
    );
  });

  it('round-trips through the CBOR codec end to end', async () => {
    const fetchFn = vi.fn(async (_url: string, init: RequestInit) => {
      expect((init.headers as Headers).get('content-type')).toBe('application/cbor');
      // Echo the request back through the same codec, proving the runtime both encodes
      // and decodes CBOR correctly, not just JSON.
      const decodedRequest = CborCodec.decode(new Uint8Array(init.body as ArrayBuffer));
      expect(decodedRequest).toEqual({ limit: 10, offset: 0 });
      return new Response(CborCodec.encode(accountPage) as BodyInit, {
        status: 200,
        headers: { 'content-type': 'application/cbor' },
      });
    });

    const runtime = new AuthzRpcRuntime('https://api.example.com', {
      auth: async () => 'test-token',
      codec: CborCodec,
      fetch: fetchFn as unknown as typeof fetch,
    });
    const client = new LightbridgeAuthzRpcClient(runtime);

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

    const runtime = new AuthzRpcRuntime('https://api.example.com', {
      auth: async () => token,
      refreshAuth,
      codec: JsonCodec,
      fetch: fetchFn as unknown as typeof fetch,
    });
    const client = new LightbridgeAuthzRpcClient(runtime);

    const page = await client.accounts.list({});

    expect(refreshAuth).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(page.items).toHaveLength(1);
  });
});
