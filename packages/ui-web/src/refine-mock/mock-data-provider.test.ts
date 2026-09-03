import { describe, expect, it } from 'vitest';

import { createMockDataProvider } from './mock-data-provider';

const FAST = { latencyMs: [0, 0] as [number, number] };

describe('createMockDataProvider', () => {
  describe('getList', () => {
    it('returns every seeded row and its total when unfiltered/unpaginated', async () => {
      const provider = createMockDataProvider(FAST);
      const { data, total } = await provider.getList({ resource: 'projects' });

      expect(total).toBe(12);
      expect(data).toHaveLength(12);
      expect(data[0]).toMatchObject({ id: 'gateway-prod', account: 'adorsys-gis' });
    });

    it('paginates when a pagination mode other than "off" is given', async () => {
      const provider = createMockDataProvider(FAST);
      const page1 = await provider.getList({
        resource: 'projects',
        pagination: { currentPage: 1, pageSize: 5 },
      });
      const page2 = await provider.getList({
        resource: 'projects',
        pagination: { currentPage: 2, pageSize: 5 },
      });

      expect(page1.data).toHaveLength(5);
      expect(page2.data).toHaveLength(5);
      expect(page1.total).toBe(12);
      expect(page1.data[0].id).not.toBe(page2.data[0].id);
    });

    it('applies "eq" and "contains" filters', async () => {
      const provider = createMockDataProvider(FAST);
      const byAccount = await provider.getList({
        resource: 'projects',
        filters: [{ field: 'account', operator: 'eq', value: 'adorsys-labs' }],
      });
      expect(byAccount.data.every((row) => row.account === 'adorsys-labs')).toBe(true);

      const bySearch = await provider.getList({
        resource: 'projects',
        filters: [{ field: 'name', operator: 'contains', value: 'gateway' }],
      });
      expect(bySearch.data.map((row) => row.id).sort()).toEqual(['gateway-edge', 'gateway-prod']);
    });

    it('sorts by the given field and order', async () => {
      const provider = createMockDataProvider(FAST);
      const { data } = await provider.getList({
        resource: 'projects',
        sorters: [{ field: 'spendMtd', order: 'desc' }],
      });
      expect(data[0].id).toBe('gateway-prod'); // highest spendMtd in the fixture
    });

    it('rejects when the resource is configured to error', async () => {
      const provider = createMockDataProvider({ ...FAST, errorResources: { projects: 'boom' } });
      await expect(provider.getList({ resource: 'projects' })).rejects.toThrow('boom');
    });

    it('simulates latency within the configured [min, max] window', async () => {
      const provider = createMockDataProvider({ latencyMs: [20, 40] });
      const start = Date.now();
      await provider.getList({ resource: 'projects' });
      expect(Date.now() - start).toBeGreaterThanOrEqual(18); // small tolerance for timer jitter
    });
  });

  describe('getOne', () => {
    it('returns the matching row', async () => {
      const provider = createMockDataProvider(FAST);
      const { data } = await provider.getOne({ resource: 'api-keys', id: 'ci-deploy' });
      expect(data).toMatchObject({ id: 'ci-deploy', status: 'active' });
    });

    it('throws for an unknown id', async () => {
      const provider = createMockDataProvider(FAST);
      await expect(
        provider.getOne({ resource: 'api-keys', id: 'does-not-exist' })
      ).rejects.toThrow();
    });
  });

  describe('create / update / deleteOne', () => {
    it('create adds a row visible to a subsequent getList', async () => {
      const provider = createMockDataProvider(FAST);
      const { data: created } = await provider.create({
        resource: 'api-keys',
        variables: {
          name: 'new-key',
          prefix: 'lb_live_zzzz…',
          status: 'active',
          statusLabel: 'active',
        },
      });
      expect(created.id).toBeDefined();

      const { data } = await provider.getList({ resource: 'api-keys' });
      expect(data.some((row) => row.id === created.id)).toBe(true);
    });

    it('update merges variables into the existing row', async () => {
      const provider = createMockDataProvider(FAST);
      const { data: updated } = await provider.update({
        resource: 'api-keys',
        id: 'ci-deploy',
        variables: { status: 'revoked', statusLabel: 'revoked' },
      });
      expect(updated).toMatchObject({ id: 'ci-deploy', status: 'revoked', statusLabel: 'revoked' });

      const { data: fetched } = await provider.getOne({ resource: 'api-keys', id: 'ci-deploy' });
      expect(fetched.status).toBe('revoked');
    });

    it('deleteOne removes the row from subsequent reads', async () => {
      const provider = createMockDataProvider(FAST);
      await provider.deleteOne({ resource: 'api-keys', id: 'ci-deploy' });
      await expect(provider.getOne({ resource: 'api-keys', id: 'ci-deploy' })).rejects.toThrow();
    });
  });

  describe('custom', () => {
    it('returns the overview aggregation snapshot', async () => {
      const provider = createMockDataProvider(FAST);
      const { data } = await provider.custom!({ url: 'overview', method: 'get' });
      expect(data).toMatchObject({ budget: { value: 142.55, ceiling: 500 } });
      expect((data as { statCards: unknown[] }).statCards.length).toBeGreaterThan(0);
    });

    // Phase 6 (admin/settings revamp): a decided row no longer moves into a `decisions`
    // resource — `DecisionsLedger` (the section that read it) is deleted, since it was never
    // backed by a real listing. `refill-requests/decide` simply removes the row now.
    it('removes an approved refill request from the pending queue', async () => {
      const provider = createMockDataProvider(FAST);
      const before = await provider.getList({ resource: 'refill-requests' });
      expect(before.data.some((row) => row.id === 'gateway-prod')).toBe(true);

      const { data: removed } = await provider.custom!({
        url: 'refill-requests/decide',
        method: 'post',
        payload: { id: 'gateway-prod', decision: 'approve', decidedBy: 'sam' },
      });
      expect((removed as { id: string }).id).toBe('gateway-prod');

      const afterPending = await provider.getList({ resource: 'refill-requests' });
      expect(afterPending.data.some((row) => row.id === 'gateway-prod')).toBe(false);
    });

    it('rejects for an unhandled url/method combination', async () => {
      const provider = createMockDataProvider(FAST);
      await expect(provider.custom!({ url: 'nope', method: 'get' })).rejects.toThrow();
    });

    it('rejects when the custom endpoint is configured to error', async () => {
      const provider = createMockDataProvider({ ...FAST, errorResources: { overview: 'no data' } });
      await expect(provider.custom!({ url: 'overview', method: 'get' })).rejects.toThrow('no data');
    });
  });

  it('isolates state between separate provider instances', async () => {
    const providerA = createMockDataProvider(FAST);
    const providerB = createMockDataProvider(FAST);

    await providerA.deleteOne({ resource: 'projects', id: 'gateway-prod' });

    const listA = await providerA.getList({ resource: 'projects' });
    const listB = await providerB.getList({ resource: 'projects' });

    expect(listA.data.some((row) => row.id === 'gateway-prod')).toBe(false);
    expect(listB.data.some((row) => row.id === 'gateway-prod')).toBe(true);
  });
});
