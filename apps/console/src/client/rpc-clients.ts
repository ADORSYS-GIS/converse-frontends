'use client';

import { createBatchLink } from '@cratestack/api';
import { createLoggerLink } from '@cratestack/link-logger';
import {
  defaultCodec,
  useAuthzRpcClient,
  useBudgetRpcClient,
  type RpcLink,
} from '@lightbridge/authz-rpc';

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
 *
 * Codec and batching now DO split by env, reversing an earlier "CBOR + batch, unconditionally"
 * decision — reinstated for exactly one reason: local dev without a `lightbridge-authz` backend.
 * `docker compose up -d wiremock` (see `wiremock/` and the README's "Dev without a backend"
 * section) can only stub plain per-op JSON responses; it cannot decode a batched CBOR envelope.
 * `defaultCodec()` (already the shared JSON-in-dev/CBOR-in-prod split every other app in this repo
 * uses — see `packages/authz-rpc/src/codec.ts`) picks JSON automatically under `next dev`
 * (`NODE_ENV !== 'production'`) and CBOR under `next build`/`next start`, so production traffic is
 * byte-for-byte unchanged. The batch link is dev-disabled the same way: every call goes straight to
 * `POST /rpc/{op_id}` instead of collapsing into one `POST /rpc/batch`, which is what the wiremock
 * stubs under `wiremock/mappings/` are written against — no batch-envelope stub to keep in sync.
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
    codec: defaultCodec(),
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
    codec: defaultCodec(),
    auth: NO_TOKEN,
    links: budgetLinks(),
  });
}
