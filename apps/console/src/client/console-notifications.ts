'use client';

import type { NotificationProvider, OpenNotificationParams } from '@refinedev/core';
import {
  useMutation,
  useMutationState,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useMemo } from 'react';

/**
 * converse-frontends#323 — `<Refine>` was mounted with no `notificationProvider`, so refine's own
 * default behaviour for a failed mutation (`useDelete`/`useCreate`/`useUpdate`/…) is to do
 * nothing visible: `handleNotification` (`@refinedev/core`) only ever calls `open?.(...)`, and
 * with no provider registered `open` is `undefined` — the failure exists in react-query's
 * `MutationCache` (it always did; that part was never the gap) but nothing renders it.
 *
 * This is the bridge, built on the exact pattern `use-shared-mutation.ts` already established for
 * "a mutation outcome visible outside the component that fired it": a module-level mutation key,
 * written through `useMutation`, read back through `useMutationState` — the shared `MutationCache`
 * IS the store (ADR 0011: "never local state, never the URL"), not a new bespoke array/context.
 * `apps/console/src/app/(console)/layout.tsx` renders the read side into `ConsoleShell`'s `banner`
 * slot, so every route gets it for free.
 *
 * Deliberately scoped to `type === 'error'` only: `open()` no-ops for `'success'`/`'progress'`, so
 * a successful mutation never produces a false-positive banner (acceptance criterion) and this
 * does not invent a toast/success-notification pattern nobody asked for. Deliberately a SINGLE
 * slot, not a queue: a second `open()` call while one failure is still showing replaces it rather
 * than stacking (acceptance criterion: "does not stack or leak state across unrelated screens").
 *
 * **The `useQueryClient()`-context gotcha this app already knows from `console-providers.tsx`
 * applies here too, in the opposite direction.** `<Refine>` supports `notificationProvider` being
 * a React hook (`@refinedev/core` calls it as `useNotificationProviderValues()`), which is exactly
 * what `useConsoleNotificationProvider` below is — but `Refine` calls that hook in ITS OWN render,
 * BEFORE it constructs the `<QueryClientProvider client={queryClient}>` that wraps `{children}`.
 * A `useMutation()` call inside this hook that relied on `useQueryClient()` context lookup would
 * find no provider yet and either throw or silently attach to some ambient/default client instead
 * of the one `console-providers.tsx` actually constructed and handed to `<Refine>`. `useMutation`'s
 * documented explicit-`queryClient`-argument override sidesteps the lookup entirely — the same
 * `queryClient` instance passed into `<Refine reactQuery.clientConfig>`, threaded down.
 */
const NOTIFICATION_MUTATION_KEY = ['console', 'notification'];

/**
 * Passed as `<Refine notificationProvider={...}>`. Must be given the SAME `QueryClient` instance
 * `console-providers.tsx` already constructed and passed to `<Refine reactQuery.clientConfig>` —
 * see the module doc comment above for why context lookup does not work here.
 */
export function useConsoleNotificationProvider(queryClient: QueryClient): NotificationProvider {
  const mutation = useMutation(
    {
      mutationKey: NOTIFICATION_MUTATION_KEY,
      mutationFn: async (params: OpenNotificationParams) => params,
    },
    queryClient
  );

  const { mutate } = mutation;

  // Stable identity across renders (`mutate` is itself stable per `useMutation` instance): the
  // object is handed to `<Refine notificationProvider>`, whose own `notificationProviderContextValues`
  // becomes new React context on every identity change — a fresh object every render would
  // re-render every consumer of refine's notification context for no reason.
  return useMemo<NotificationProvider>(
    () => ({
      open: (params) => {
        if (params.type !== 'error') return;
        mutate(params);
      },
      close: () => {
        // Refine only calls `close(key)` from its auth hooks (`useLogout`/`useLogin`/…) — none of
        // which this console registers an `authProvider` for (the Keycloak proxy owns auth
        // entirely, `console-providers.tsx`'s own doc comment), so this path is dead in practice.
        // It still evicts the one slot this bridge owns, matching `useSharedMutation.dismiss()`.
        const cache = queryClient.getMutationCache();
        for (const entry of cache.findAll({
          mutationKey: NOTIFICATION_MUTATION_KEY,
          exact: true,
        })) {
          cache.remove(entry);
        }
      },
    }),
    [mutate, queryClient]
  );
}

/**
 * The read side, for whichever component renders the banner (`(console)/layout.tsx`). Unlike
 * `useConsoleNotificationProvider`, this runs INSIDE `<Refine>`'s own `QueryClientProvider` (every
 * route is), so plain context-resolved `useMutationState` is correct here — no explicit
 * `queryClient` argument needed.
 */
export function useConsoleNotification(): OpenNotificationParams | undefined {
  const states = useMutationState({
    filters: { mutationKey: NOTIFICATION_MUTATION_KEY, exact: true },
    select: (entry) => entry.state.data as OpenNotificationParams | undefined,
  });
  return states.at(-1);
}

/**
 * The dismiss half of the read side — same MutationCache eviction as
 * `useConsoleNotificationProvider`'s own `close()`, but resolvable via ordinary context
 * (`useQueryClient()`) because whatever calls this always renders inside `<Refine>`'s
 * `QueryClientProvider`, unlike the provider-construction site.
 */
export function useDismissConsoleNotification(): () => void {
  const queryClient = useQueryClient();
  return () => {
    const cache = queryClient.getMutationCache();
    for (const entry of cache.findAll({ mutationKey: NOTIFICATION_MUTATION_KEY, exact: true })) {
      cache.remove(entry);
    }
  };
}

/** Prefer the real underlying cause (`description`, e.g. `err.message`) over refine's own
 * templated `message` ("Error (status code: 500)") when both are present — the same "surface the
 * genuine failure, not a generic fallback" preference `use-admin-screen.ts` applies to
 * `decide.errorMessage` (converse-frontends#322). */
export function notificationText(
  notification: OpenNotificationParams | undefined
): string | undefined {
  if (!notification) return undefined;
  return notification.description ?? notification.message;
}
