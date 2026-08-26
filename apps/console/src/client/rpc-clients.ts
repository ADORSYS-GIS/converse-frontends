'use client';

import { createBatchLink } from '@cratestack/api';
import { createLoggerLink } from '@cratestack/link-logger';
import { useAuthzRpcClient, useBudgetRpcClient, type RpcLink } from '@lightbridge/authz-rpc';
import { getWebCborCodec } from '@lightbridge/authz-rpc/web-codec';

/**
 * The browser-side cratestack clients (ADR 0009 Decision 7: whatever can be managed on the client
 * is managed on the client).
 *
 * Two things are deliberately different from `apps/self-service`'s wiring:
 *
 * 1. **No auth closures.** `auth` resolves to the empty string, so the runtime sets no
 *    `Authorization` header at all, and `refreshAuth` is omitted entirely. The proxy owns both
 *    (ADR 0009 Decision 2) — a token in page JavaScript is exactly what this rebuild removes.
 * 2. **Same-origin base URLs.** `/api` and `/api/budget` are Next route handlers, not backends.
 * 3. **A different codec.** `codec: getWebCborCodec()` passes `@cratestack/cbor` explicitly
 *    (`@lightbridge/authz-rpc/web-codec`) instead of relying on `packages/authz-rpc/src/codec.ts`'s
 *    `defaultCodec()` (the `cborg`-based codec `apps/self-service` still uses). See that module's
 *    doc comment for why: no `@cratestack/cbor` backend runs under Hermes, so it stays
 *    console-only. `getWebCborCodec()` is synchronous and only ever reached after
 *    `./providers.tsx`'s `ssr: false` boundary has already awaited `ensureWebCborCodecReady()` —
 *    these hooks never run before that.
 *
 * There is exactly one wire format now (lightbridge-authz ADR-0013 / converse-frontends#256):
 * CBOR, always, on every environment including local dev. `docker compose up -d wiremock` (see
 * `wiremock/` and the README's "Dev without a backend" section) stubs plain per-op JSON responses
 * and cannot decode a batched CBOR envelope, which is why the batch link stays dev-disabled below
 * — every call goes straight to `POST /rpc/{op_id}` instead of collapsing into one
 * `POST /rpc/batch`, matching what `wiremock/mappings/` is written against. That batching
 * decision is independent of the codec split above; the earlier claim that this file's codec
 * choice also varied `next dev` vs. `next build` predates ADR-0013 and is no longer true.
 *
 * The batch links are still module-scope singletons in production: `createBatchLink()` accumulates
 * a per-tick batch window, so a fresh instance per render would defeat batching entirely (the same
 * reason `apps/self-service/src/app/_layout.tsx` hoists them).
 *
 * `window.location.origin` is read unguarded on purpose: the generated runtime resolves its URLs
 * against an absolute origin, and the factory caches the runtime on first construction — so
 * constructing one during a server render would permanently bake in a bogus origin. The entire
 * provider tree is mounted browser-only (`ssr: false`, see `./providers.tsx`) precisely so this
 * call can never happen on the server.
 */

const NO_TOKEN = async () => '';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function links(): RpcLink[] {
  // The logger link is dev-only: in production it would print every op-id and payload shape to the
  // user's console for anything on the page to read. The batch link is production-only — see the
  // module doc comment above for why dev skips it.
  return IS_PRODUCTION ? [batchLink] : [createLoggerLink()];
}

const batchLink = createBatchLink();
const budgetBatchLink = createBatchLink();

function budgetLinks(): RpcLink[] {
  return IS_PRODUCTION ? [budgetBatchLink] : [createLoggerLink()];
}

/** The `authz-api` CRUD client, pointed at the console's own `/api/rpc/*` proxy. */
export function useConsoleAuthzClient() {
  return useAuthzRpcClient({
    baseURL: window.location.origin,
    basePath: '/api',
    codec: getWebCborCodec(),
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
    codec: getWebCborCodec(),
    auth: NO_TOKEN,
    links: budgetLinks(),
  });
}
