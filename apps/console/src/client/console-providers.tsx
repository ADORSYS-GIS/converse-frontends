'use client';

import { QueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { Refine } from '@refinedev/core';
import { createCratestackRpcDataProvider } from '@cratestack/refine';
import { cratestackRefineResources } from '@lightbridge/authz-rpc/refine';
import { useEffect, useMemo, type ReactNode } from 'react';

import {
  QUERY_CACHE_BUSTER,
  QUERY_CACHE_MAX_AGE_MS,
  createIndexedDbPersister,
} from './query-persister';
import { useConsoleAuthzClient, useConsoleBudgetClient } from './rpc-clients';

/**
 * The refine root (ADR 0009 Decision 4). Everything below this component runs in the browser and
 * talks to same-origin `/api/*` route handlers.
 *
 * The resource manifest is **generated**, not hand-written: `cratestack generate-typescript
 * --refine` emits `cratestackRefineResources()` from `schema/authz.cstack`, which
 * `createCratestackRpcDataProvider()` turns into a full `DataProvider` (pagination via `@@paged`
 * `totalCount`, filtering, sorting, `@version` optimistic locking via `If-Match`). That is the
 * "less hand-written code" lever the ADR is after.
 *
 * Exactly one data provider is registered, over `authz-api`. The `authz-budget` microservice hosts
 * no models at all — only the 14 `budget:*` **procedures** — and a refine `DataProvider` has no slot
 * for a procedure, so registering a second named provider there would be a resource map bound to
 * endpoints that 404. The budget client is used directly instead (see
 * `containers/admin-container.tsx`), through the same `QueryClient`.
 */
export function ConsoleProviders({ children }: { children: ReactNode }) {
  const authzClient = useConsoleAuthzClient();
  // Constructed here, not in the admin container, because the factory caches one runtime per
  // process: building it inside a route-scoped component would tie the singleton's lifetime to
  // whichever screen happened to mount first.
  useConsoleBudgetClient();

  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Long enough that a rehydrated cache is served immediately on a cold, offline start
            // instead of being refetched into an error.
            staleTime: 30_000,
            gcTime: QUERY_CACHE_MAX_AGE_MS,
            retry: 1,
            refetchOnWindowFocus: false,
            networkMode: 'offlineFirst',
          },
          mutations: {
            // ADR 0009 Decision 7: mutations require connectivity — no offline mutation queue.
            networkMode: 'online',
          },
        },
      }),
    []
  );

  useEffect(() => {
    const [unsubscribe] = persistQueryClient({
      queryClient,
      persister: createIndexedDbPersister(),
      maxAge: QUERY_CACHE_MAX_AGE_MS,
      buster: QUERY_CACHE_BUSTER,
    });
    return unsubscribe;
  }, [queryClient]);

  const dataProvider = useMemo(
    () => createCratestackRpcDataProvider(cratestackRefineResources(authzClient)),
    [authzClient]
  );

  return (
    <Refine
      dataProvider={dataProvider}
      resources={[
        { name: 'accounts', meta: { label: 'Accounts' } },
        { name: 'projects', meta: { label: 'Projects' } },
        { name: 'apiKeys', meta: { label: 'API keys' } },
        { name: 'projectMembers', meta: { label: 'Members' } },
      ]}
      options={{
        // No `routerProvider` is registered: Next's App Router owns navigation, and the console's
        // list state lives in component state, not the URL. Turning `syncWithLocation` on without a
        // router binding would silently do nothing.
        syncWithLocation: false,
        disableTelemetry: true,
        warnWhenUnsavedChanges: false,
        reactQuery: { clientConfig: queryClient },
      }}>
      {children}
    </Refine>
  );
}
