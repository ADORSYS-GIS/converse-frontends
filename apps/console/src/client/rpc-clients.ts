'use client';

import { createBatchLink } from '@cratestack/api';
import { createLoggerLink } from '@cratestack/link-logger';
import {
  CborCodec,
  useAuthzRpcClient,
  useBudgetRpcClient,
  type RpcLink,
} from '@lightbridge/authz-rpc';

/**
 * The browser-side cratestack clients (ADR 0009 Decision 7: whatever can be managed on the client
 * is managed on the client).
 *
 * Three things are deliberately different from `apps/self-service`'s wiring:
 *
 * 1. **No auth closures.** `auth` resolves to the empty string, so the runtime sets no
 *    `Authorization` header at all, and `refreshAuth` is omitted entirely. The proxy owns both
 *    (ADR 0009 Decision 2) — a token in page JavaScript is exactly what this rebuild removes.
 * 2. **CBOR unconditionally.** Both legs of the call are ours now, so there is no dev/prod codec
 *    split to keep in sync and no `EXPO_PUBLIC_RPC_CODEC` to drift. `stripUndefined`'s
 *    `Option<T>` handling lives inside `CborCodec` and travels with it.
 * 3. **Same-origin base URLs.** `/api` and `/api/budget` are Next route handlers, not backends.
 *
 * The links are module-scope singletons: `createBatchLink()` accumulates a per-tick batch window,
 * so a fresh instance per render would defeat batching entirely (the same reason
 * `apps/self-service/src/app/_layout.tsx` hoists them).
 *
 * `window.location.origin` is read unguarded on purpose: the generated runtime resolves its URLs
 * against an absolute origin, and the factory caches the runtime on first construction — so
 * constructing one during a server render would permanently bake in a bogus origin. The entire
 * provider tree is mounted browser-only (`ssr: false`, see `./providers.tsx`) precisely so this
 * call can never happen on the server.
 */

const NO_TOKEN = async () => '';

function links(): RpcLink[] {
  // The logger link is dev-only: in production it would print every op-id and payload shape to the
  // user's console for anything on the page to read.
  return process.env.NODE_ENV === 'production' ? [batchLink] : [createLoggerLink(), batchLink];
}

const batchLink = createBatchLink();
const budgetBatchLink = createBatchLink();

function budgetLinks(): RpcLink[] {
  return process.env.NODE_ENV === 'production'
    ? [budgetBatchLink]
    : [createLoggerLink(), budgetBatchLink];
}

/** The `authz-api` CRUD client, pointed at the console's own `/api/rpc/*` proxy. */
export function useConsoleAuthzClient() {
  return useAuthzRpcClient({
    baseURL: window.location.origin,
    basePath: '/api',
    codec: CborCodec,
    auth: NO_TOKEN,
    links: links(),
  });
}

/**
 * The `authz-budget` client. `basePath: '/api/budget'` because the proxy re-adds the fixed
 * `/budget` prefix upstream — see `useBudgetRpcClient`'s doc comment in `packages/authz-rpc`.
 */
export function useConsoleBudgetClient() {
  return useBudgetRpcClient({
    baseURL: window.location.origin,
    basePath: '/api/budget',
    codec: CborCodec,
    auth: NO_TOKEN,
    links: budgetLinks(),
  });
}
