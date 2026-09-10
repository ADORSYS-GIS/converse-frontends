'use client';

import { useParams } from 'next/navigation';

import { decodeRouteParam } from '../shared/route-params';

/**
 * The account id path segment — `/accounts/[accountId]/*` (IA v3 phase 1, "account into the
 * path"). Every screen in the console now lives under this segment, so `accountId` is never
 * optional wherever this hook is called: it throws rather than returning an empty string, the
 * same "fail loud, not silent" contract `useAccountId` callers can build on without a defensive
 * `if (!accountId)` at every call site.
 *
 * Before this phase, the account was `?account=` in the URL (`client/url-state.ts`'s
 * `scopeParsers.accountId`), resolved with an empty-string default and a first-account fallback
 * inside `use-console-scope.ts`. That resolution now happens once, at `/` (the account resolver
 * route — `app/(console)/page.tsx`), which redirects into a concrete `/accounts/<id>/...` URL; by
 * the time any screen under `/accounts/[accountId]/*` renders, the id is a real path segment, not
 * a value that might still be resolving.
 *
 * A route rendered outside `/accounts/[accountId]/*` (there should be none under the `(console)`
 * group after this phase, short of a defect) gets `useParams()` back with no `accountId` key at
 * all — Next.js does not backfill an absent dynamic segment. Throwing here turns that misrouting
 * into a loud, developer-facing error at the call site instead of every downstream consumer
 * quietly treating `''` as "no account."
 *
 * **The value is percent-DECODED here** (`decodeRouteParam`, 2026-09-03). `useParams()` reads the
 * Flight router tree's raw segment values (Next's own `getSelectedParams`), exactly as a Server
 * Component's `params` does — so an account id carrying a `/` or a `:` arrives encoded, and every
 * RPC issued with it would name an account that exists nowhere. Account ids are cuid2 today, which
 * is why nothing has broken here yet; the estate pages take arbitrary backend-supplied ids and
 * that is where it DID break, so the decode is applied at every route boundary rather than only at
 * the one that has already failed.
 */
export function useAccountId(): string {
  const params = useParams<{ accountId: string }>();
  const accountId = params?.accountId ? decodeRouteParam(params.accountId) : params?.accountId;
  if (!accountId) {
    throw new Error(
      'useAccountId() called outside /accounts/[accountId]/* — accountId is never optional there. ' +
        'If this route is meant to be account-scoped, it must live under app/(console)/accounts/' +
        '[accountId]/.'
    );
  }
  return accountId;
}
