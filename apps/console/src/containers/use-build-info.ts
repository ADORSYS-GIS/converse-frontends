'use client';

import type { ServerBuildInfo } from '@lightbridge/authz-rpc';
import type { BuildInfoEntry, BuildInfoFacts } from '@lightbridge/ui-web';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { useConsoleAuthzClient, useConsoleBudgetClient } from '../client/rpc-clients';

/**
 * `/settings/info`'s "Platform" card — the data adapter (lightbridge-authz#573).
 *
 * ## Two transports, on purpose
 *
 * | service | how | why |
 * | --- | --- | --- |
 * | `authz-api` | `getBuildInfo()` over the console's own `/api` proxy | it is the client every other screen uses |
 * | `authz-budget` | `getBuildInfo()` over `/api/budget` | same |
 * | `authz-idp` | `GET /api/build-info`, server-side | no RPC surface exists on it |
 * | `authz-usage` | `GET /api/build-info`, server-side | its query listener is mTLS-only |
 *
 * The first two go over the REAL RPC path rather than being folded into the server route that
 * already exists for the other two. That is not duplication for its own sake: on a diagnostics
 * screen, "authz-api reported its build over the same client the API-keys screen uses" is itself a
 * fact worth having — it distinguishes "the backend is wrong" from "the console cannot reach the
 * backend at all", which a server-side fan-out would hide behind the console's own network.
 *
 * ## Not refine
 *
 * `getBuildInfo` is a cratestack PROCEDURE, and refine's `DataProvider` models resource CRUD only
 * — the same reason `/admin/roles` and the refills queue go through TanStack Query directly, on
 * the same `QueryClient` refine uses.
 */

/** Fresh enough to be useful during a rollout, cheap enough not to matter: the underlying reads
 *  are three environment lookups and a few `&'static str` copies on the backend side. Refetched on
 *  mount rather than cached across navigations for exactly the reason the route sets `no-store` —
 *  a stale answer on this screen is the wrong answer. */
const STALE_TIME_MS = 0;

const API_QUERY_KEY = ['authz', 'getBuildInfo', 'api'];
const BUDGET_QUERY_KEY = ['authz', 'getBuildInfo', 'budget'];
const SERVER_QUERY_KEY = ['console', 'buildInfo', 'server'];

/** What `GET /api/build-info` answers with. Mirrors `server/build-info.ts`'s own result union. */
interface ServerBuildInfoResponse {
  services: (
    | { id: string; status: 'ready'; facts: BuildInfoFacts }
    | { id: string; status: 'unavailable'; caption: string }
    | { id: string; status: 'error'; message: string }
  )[];
}

/**
 * The RPC answer, mapped onto the section's field names.
 *
 * The wire type marks the three image fields `string | null | undefined` (nullable in the schema,
 * because a backend outside a container genuinely has no image identity). `?? undefined` collapses
 * `null` to absent, which is what the section's "omit the row entirely" rule keys on — a `null`
 * left in place would render as an empty value rather than no row.
 */
function factsFromRpc(info: ServerBuildInfo): BuildInfoFacts {
  return {
    version: info.version,
    commitSha: info.gitSha,
    commitShortSha: info.gitShortSha,
    commitDate: info.gitCommitDate,
    dirty: info.gitDirty,
    toolchain: info.rustcVersion,
    builtAt: info.buildTime,
    imageSha: info.imageBuildSha ?? undefined,
    imageTag: info.imageTag ?? undefined,
    imageBuiltAt: info.imageBuildTime ?? undefined,
  };
}

/** Shown in place of whatever the transport threw. Deliberately not the raw error: a cratestack
 *  transport failure's message is a URL and a status code, which is neither actionable for the
 *  reader nor something this screen prints (it refuses to show backend origins at all). */
const RPC_FAILURE_MESSAGE = 'Could not read the backend build. The RPC call failed.';
const SERVER_FAILURE_MESSAGE = 'Could not read these services. The console could not reach them.';

/** One RPC query's result as a section entry. */
function rpcEntry(
  id: string,
  description: string,
  query: UseQueryResult<ServerBuildInfo>
): BuildInfoEntry {
  if (query.isPending) {
    return { id, label: id, description, state: { status: 'loading' } };
  }
  if (query.isError || !query.data) {
    return {
      id,
      label: id,
      description,
      state: {
        status: 'error',
        errorMessage: RPC_FAILURE_MESSAGE,
        onRetry: () => void query.refetch(),
      },
    };
  }
  return {
    id,
    label: id,
    description,
    state: { status: 'ready', facts: factsFromRpc(query.data) },
  };
}

export interface BuildInfoScreen {
  /** The backend entries, in a fixed order — `authz-api`, `authz-budget`, `authz-idp`,
   *  `authz-usage`. The console's own entry is prepended by the view, which is where it comes
   *  from (server props, not a query). */
  entries: BuildInfoEntry[];
}

export function useBuildInfo(): BuildInfoScreen {
  const authzClient = useConsoleAuthzClient();
  const budgetClient = useConsoleBudgetClient();

  const apiQuery = useQuery({
    queryKey: API_QUERY_KEY,
    queryFn: () => authzClient.procedures.getBuildInfo({ args: {} }),
    staleTime: STALE_TIME_MS,
  });

  const budgetQuery = useQuery({
    queryKey: BUDGET_QUERY_KEY,
    queryFn: () => budgetClient.procedures.getBuildInfo({ args: {} }),
    staleTime: STALE_TIME_MS,
  });

  const serverQuery = useQuery({
    queryKey: SERVER_QUERY_KEY,
    queryFn: async (): Promise<ServerBuildInfoResponse> => {
      const response = await fetch('/api/build-info', {
        headers: { accept: 'application/json' },
        cache: 'no-store',
      });
      if (!response.ok) throw new Error(`build-info route answered ${response.status}`);
      return (await response.json()) as ServerBuildInfoResponse;
    },
    staleTime: STALE_TIME_MS,
  });

  const serverEntries: BuildInfoEntry[] = ['authz-idp', 'authz-usage'].map((id) => {
    const description = 'GET /version, server-side';
    if (serverQuery.isPending) {
      return { id, label: id, description, state: { status: 'loading' } };
    }
    if (serverQuery.isError) {
      return {
        id,
        label: id,
        description,
        state: {
          status: 'error',
          errorMessage: SERVER_FAILURE_MESSAGE,
          onRetry: () => void serverQuery.refetch(),
        },
      };
    }
    const service = serverQuery.data?.services.find((entry) => entry.id === id);
    if (!service) {
      // The route answered but did not mention this service at all. Honest reading: nothing was
      // reported, and saying so beats inventing either a value or a failure.
      return {
        id,
        label: id,
        description,
        state: { status: 'unavailable', caption: 'This service reported nothing.' },
      };
    }
    if (service.status === 'ready') {
      return { id, label: id, description, state: { status: 'ready', facts: service.facts } };
    }
    if (service.status === 'unavailable') {
      return {
        id,
        label: id,
        description,
        state: { status: 'unavailable', caption: service.caption },
      };
    }
    return {
      id,
      label: id,
      description,
      state: {
        status: 'error',
        errorMessage: service.message,
        onRetry: () => void serverQuery.refetch(),
      },
    };
  });

  return {
    entries: [
      rpcEntry('authz-api', 'getBuildInfo over /api', apiQuery),
      rpcEntry('authz-budget', 'getBuildInfo over /api/budget', budgetQuery),
      ...serverEntries,
    ],
  };
}
