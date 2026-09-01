// Storybook-only mock refine.dev DataProvider — console-ui skill "Refine-driven mock screens" /
// docs/adr/0009-nextjs-console-replacement.md Decision 4 (refine.dev + cratestack's generated
// refine provider). This is NOT the real provider apps/console will use (that's
// `createCratestackRpcDataProvider` from `@cratestack/refine`) — it is an in-memory stand-in over
// the same fixtures already shipped beside each section, so the refine wiring's real
// look and behaviour (lists, selection, forms) is verifiable in Storybook before apps/console, or
// the generated cratestack provider, exist.
//
// Never exported from `src/index.ts` (console-ui skill contract) and never imported by the pure
// sections themselves.

import type {
  BaseRecord,
  CreateResponse,
  CrudFilter,
  CrudSort,
  DataProvider,
  DeleteOneResponse,
  GetListResponse,
  GetOneResponse,
  UpdateResponse,
} from '@refinedev/core';

import { projectsFixture } from '../sections/projects-ledger/fixtures';
import type { ProjectRow } from '../sections/projects-ledger/types';
import { manageAccountOptions } from '../sections/manage-controls/fixtures';
import { apiKeysFixture } from '../sections/api-keys-ledger/fixtures';
import type { ApiKeyRow } from '../sections/api-keys-ledger/types';
import { pendingRequestsFixture } from '../sections/review-queue/fixtures';
import type { RefillRequestRow } from '../sections/review-queue/types';
import { overviewStatCards } from '../sections/overview-stat-row/fixtures';
import type { OverviewStatCardData } from '../sections/overview-stat-row/types';
import { overviewSpendSeries } from '../sections/spend-dashboard/fixtures';
import { rankedRowsDominantModel } from '../sections/ranked-series-rows/fixtures';
import type { RankedSeriesRow } from '../sections/ranked-series-rows/types';
import { overviewBudget } from '../sections/budget-panel/fixtures';
import type { BudgetSummary } from '../sections/budget-panel/types';
import type { SpendSeriesSeries } from '../components/spend-series-chart';

/** The CRUD resources the mock provider seeds. `decisions` (phase 6, admin/settings revamp) is
 *  gone: it fed the deleted `DecisionsLedger`, which was never backed by a real listing — see
 *  `apps/console/src/containers/use-admin-screen.ts`'s own doc comment for the fuller history. */
export type MockResourceName = 'projects' | 'accounts' | 'api-keys' | 'refill-requests';

export type MockAccountRecord = BaseRecord & { id: string; label: string };

/**
 * Snapshot payload for the read-only `overview` custom endpoint (`useCustom({ url: 'overview' })`) —
 * the aggregation refine's `useCustom` hook fetches for `RefineOverviewScreen`.
 *
 * Kept in step with `/`'s real shape (`apps/console/src/containers/use-overview-screen.ts`'s
 * `OverviewScreen`, IA v3 phase 4): `modelSpendRows` (not `modelSpendSegments`) since SPEND BY
 * MODEL renders through `RankedSeriesRows` now, not `SpendShareSection`/`ShareBar` (build brief
 * §7); `needsAttentionProject`/`refillRequestStatus` are gone — `/` renders no admin-only zone at
 * all any more (BUDGET PRESSURE moved to `/settings/overview/project`, KEY HYGIENE to
 * `/settings/overview/account`, and the refill count lives in the settings nav's own numeral).
 */
export interface OverviewSnapshot {
  statCards: OverviewStatCardData[];
  spendSeries: SpendSeriesSeries[];
  /** "Spend by model" (phase 9.2). */
  modelSpendRows: RankedSeriesRow[];
  budget: BudgetSummary;
}

/** Payload for the `refill-requests/decide` custom mutation (`useCustomMutation`). */
export interface DecideRefillPayload {
  id: string;
  decision: 'approve' | 'decline';
  note?: string;
  decidedBy?: string;
}

type Store = {
  projects: ProjectRow[];
  accounts: MockAccountRecord[];
  'api-keys': ApiKeyRow[];
  'refill-requests': RefillRequestRow[];
};

function seedStore(): Store {
  return structuredClone({
    projects: projectsFixture,
    accounts: manageAccountOptions
      .filter((option) => option.value !== 'all')
      .map((option) => ({ id: option.value, label: option.label })),
    'api-keys': apiKeysFixture,
    'refill-requests': pendingRequestsFixture,
  });
}

function seedOverviewSnapshot(): OverviewSnapshot {
  return structuredClone({
    statCards: overviewStatCards,
    spendSeries: overviewSpendSeries,
    modelSpendRows: rankedRowsDominantModel,
    budget: overviewBudget,
  });
}

export interface MockDataProviderConfig {
  /** [min, max] ms of simulated network latency per call. Defaults to `[300, 600]`. */
  latencyMs?: [number, number];
  /** Resource name (or custom `url`) → error message. That call rejects instead of resolving —
   * the error-mode story wiring named in the task. */
  errorResources?: Partial<Record<MockResourceName | 'overview' | 'refill-requests/decide', string>>;
}

function isStoreResource(resource: string): resource is MockResourceName {
  return resource === 'projects' || resource === 'accounts' || resource === 'api-keys' || resource === 'refill-requests';
}

function applyLogicalFilter(row: BaseRecord, filter: Extract<CrudFilter, { field: string }>): boolean {
  const rowValue = (row as Record<string, unknown>)[filter.field];
  switch (filter.operator) {
    case 'eq':
      return rowValue === filter.value;
    case 'ne':
      return rowValue !== filter.value;
    case 'contains':
      return typeof rowValue === 'string' && typeof filter.value === 'string'
        ? rowValue.toLowerCase().includes(filter.value.toLowerCase())
        : false;
    case 'in':
      return Array.isArray(filter.value) ? filter.value.includes(rowValue) : false;
    default:
      // Trivial filter support per the task ("filters where trivial") — unsupported operators
      // simply don't filter, rather than throwing on a story that passes one.
      return true;
  }
}

function applyFilters<T extends BaseRecord>(data: T[], filters: CrudFilter[] | undefined): T[] {
  if (!filters || filters.length === 0) return data;
  return data.filter((row) =>
    filters.every((filter) => ('field' in filter ? applyLogicalFilter(row, filter) : true)),
  );
}

function applySorters<T extends BaseRecord>(data: T[], sorters: CrudSort[] | undefined): T[] {
  if (!sorters || sorters.length === 0) return data;
  const [sorter] = sorters;
  const direction = sorter.order === 'desc' ? -1 : 1;
  return [...data].sort((a, b) => {
    const av = (a as Record<string, unknown>)[sorter.field];
    const bv = (b as Record<string, unknown>)[sorter.field];
    if (av === bv) return 0;
    if (av === null || av === undefined) return 1;
    if (bv === null || bv === undefined) return -1;
    return av > bv ? direction : -direction;
  });
}

/** Builds a fresh, isolated in-memory refine `DataProvider` over the console section fixtures — call
 * once per story/test so mutations (create/update/delete) never leak across renders. */
export function createMockDataProvider(config: MockDataProviderConfig = {}): DataProvider {
  const [latencyMin, latencyMax] = config.latencyMs ?? [300, 600];
  const store = seedStore();
  const overview = seedOverviewSnapshot();

  async function delay(): Promise<void> {
    const ms = latencyMin + Math.random() * Math.max(0, latencyMax - latencyMin);
    if (ms <= 0) return;
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  function maybeFail(key: string): void {
    const message = config.errorResources?.[key as keyof NonNullable<MockDataProviderConfig['errorResources']>];
    if (message) throw new Error(message);
  }

  function resourceStore(resource: string): BaseRecord[] {
    if (!isStoreResource(resource)) {
      throw new Error(`Mock data provider: unknown resource "${resource}".`);
    }
    return store[resource];
  }

  function setResourceStore(resource: MockResourceName, rows: BaseRecord[]): void {
    (store as Record<MockResourceName, BaseRecord[]>)[resource] = rows;
  }

  return {
    getApiUrl: () => 'mock://refine-ui-web',

    async getList<TData extends BaseRecord = BaseRecord>({ resource, pagination, filters, sorters }: Parameters<DataProvider['getList']>[0]) {
      await delay();
      maybeFail(resource);

      let data = applyFilters(structuredClone(resourceStore(resource)), filters);
      data = applySorters(data, sorters);
      const total = data.length;

      if (pagination && pagination.mode !== 'off') {
        const currentPage = pagination.currentPage ?? 1;
        const pageSize = pagination.pageSize ?? 10;
        data = data.slice((currentPage - 1) * pageSize, currentPage * pageSize);
      }

      return { data, total } as GetListResponse<TData>;
    },

    async getOne<TData extends BaseRecord = BaseRecord>({ resource, id }: Parameters<DataProvider['getOne']>[0]) {
      await delay();
      maybeFail(resource);

      const row = resourceStore(resource).find((candidate) => String(candidate.id) === String(id));
      if (!row) throw new Error(`Mock data provider: ${resource} "${id}" not found.`);
      return { data: structuredClone(row) } as GetOneResponse<TData>;
    },

    async create<TData extends BaseRecord = BaseRecord>({ resource, variables }: Parameters<DataProvider['create']>[0]) {
      await delay();
      maybeFail(resource);
      if (!isStoreResource(resource)) throw new Error(`Mock data provider: unknown resource "${resource}".`);

      const row = { id: `${resource}-${Date.now()}-${Math.round(Math.random() * 1000)}`, ...(variables as object) } as BaseRecord;
      setResourceStore(resource, [row, ...resourceStore(resource)]);
      return { data: row } as CreateResponse<TData>;
    },

    async update<TData extends BaseRecord = BaseRecord>({ resource, id, variables }: Parameters<DataProvider['update']>[0]) {
      await delay();
      maybeFail(resource);
      if (!isStoreResource(resource)) throw new Error(`Mock data provider: unknown resource "${resource}".`);

      const rows = resourceStore(resource);
      const index = rows.findIndex((candidate) => String(candidate.id) === String(id));
      if (index === -1) throw new Error(`Mock data provider: ${resource} "${id}" not found.`);

      const updated = { ...rows[index], ...(variables as object) };
      const next = [...rows];
      next[index] = updated;
      setResourceStore(resource, next);
      return { data: updated } as UpdateResponse<TData>;
    },

    async deleteOne<TData extends BaseRecord = BaseRecord>({ resource, id }: Parameters<DataProvider['deleteOne']>[0]) {
      await delay();
      maybeFail(resource);
      if (!isStoreResource(resource)) throw new Error(`Mock data provider: unknown resource "${resource}".`);

      const rows = resourceStore(resource);
      const index = rows.findIndex((candidate) => String(candidate.id) === String(id));
      if (index === -1) throw new Error(`Mock data provider: ${resource} "${id}" not found.`);

      const [removed] = rows.splice(index, 1);
      setResourceStore(resource, [...rows]);
      return { data: removed } as DeleteOneResponse<TData>;
    },

    async custom<TData extends BaseRecord = BaseRecord>({ url, method, payload }: Parameters<NonNullable<DataProvider['custom']>>[0]) {
      await delay();

      if (url === 'overview' && method === 'get') {
        maybeFail('overview');
        return { data: structuredClone(overview) as unknown as TData };
      }

      if (url === 'refill-requests/decide' && method === 'post') {
        maybeFail('refill-requests/decide');
        const { id, note, decidedBy } = payload as DecideRefillPayload;

        const pending = store['refill-requests'];
        const index = pending.findIndex((row) => row.id === id);
        if (index === -1) throw new Error(`Mock data provider: refill request "${id}" not found.`);

        // Phase 6 (admin/settings revamp): the decided row no longer moves into a `decisions`
        // resource — `DecisionsLedger` (the section that read it) is deleted, since it was never
        // backed by a real listing. The mock queue does not persist reviewer notes or who decided,
        // matching the real provider's own contract (`use-admin-screen.ts`'s `decide.mutationFn`
        // sends nothing back beyond the decision itself).
        void note;
        void decidedBy;
        const [removed] = pending.splice(index, 1);
        setResourceStore('refill-requests', [...pending]);

        return { data: removed as unknown as TData };
      }

      throw new Error(`Mock data provider: unhandled custom request "${method} ${url}".`);
    },
  };
}
