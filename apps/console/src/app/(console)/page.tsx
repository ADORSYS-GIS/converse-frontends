'use client';

import { AccountSettings } from '@lightbridge/ui-web/src/sections/account-settings';
import { ErrorLine } from '@lightbridge/ui-web/src/components/error-line';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useResolverParams } from '../../client/url-state';
import { useOpenCreateAccountDialog } from '../../containers/use-create-account-dialog';
import { useAccountResolver, writeLastAccountId } from '../../containers/use-account-resolver';

export const dynamic = 'force-dynamic';

/**
 * `/` — the account resolver (IA v3 phase 1, "account into the path").
 *
 * Every real screen now lives under `/accounts/[accountId]/*`; this route's only job is to pick
 * an account and redirect there. It resolves `useAccountResolver()`'s `targetAccountId` (the
 * remembered `lightbridge.last-account`, falling back to the first account the backend returns)
 * and `router.replace`s to `/accounts/<id>/<next>`, where `<next>` (`?next=`, default `overview`)
 * lets a legacy deep link survive the hop — `middleware.ts`'s redirect table sends
 * `/projects?account=A` here as `/accounts/A/projects` directly, but a *bare* `/projects` becomes
 * `/?next=projects`, which needs this route to still land on Projects once the account is known.
 *
 * Three outcomes besides the redirect, all gated on the query having genuinely SETTLED (never
 * while loading — a `null`/`false` mid-flight is not evidence of anything):
 *
 *  - **Zero accounts** — a brand-new identity — renders the same first-run create-account surface
 *    `/settings/account` uses (`AccountSettings`, `ui-web/sections/account-settings`) in place,
 *    rather than redirecting to nowhere. Creating an account here (the shared dialog
 *    `app/(console)/layout.tsx` mounts) makes the account list settle non-empty, which re-runs
 *    the redirect effect on its own — no manual "now go there" step needed.
 *  - **Query error** — `ErrorLine` with `Retry`, never a silent redirect loop or a blank page.
 *  - **Resolving** — a brief `InlineStatus` between "settled" and "browser has navigated away";
 *    this route has no other content of its own to show meanwhile.
 *
 * `useAccountResolver` and `useConsoleScope` are deliberately two separate `useList` calls rather
 * than one shared hook: this route runs OUTSIDE `/accounts/[accountId]/*`, where
 * `useConsoleScope()`'s account half falls back to "first account" too (see that hook's own doc
 * comment) — reusing it here would work, but would blur which hook owns the REDIRECT decision.
 * TanStack Query dedupes the identical `resource: 'accounts'` query by key regardless, so this
 * costs no extra network traffic over sharing one hook would have.
 */
export default function AccountResolverRoute() {
  const router = useRouter();
  const resolver = useAccountResolver();
  const [params] = useResolverParams();
  const openCreateAccount = useOpenCreateAccountDialog();

  const settled = !resolver.loading && !resolver.error;
  const zeroAccounts = settled && resolver.accounts.length === 0;
  const targetAccountId = resolver.targetAccountId;

  useEffect(() => {
    if (!targetAccountId) return;
    writeLastAccountId(targetAccountId);
    router.replace(`/accounts/${targetAccountId}/${params.next}`);
  }, [targetAccountId, params.next, router]);

  if (resolver.error) {
    return (
      <div className="p-5">
        <ErrorLine message="Could not load your accounts." onRetry={resolver.retry} />
      </div>
    );
  }

  if (zeroAccounts) {
    return (
      <div className="p-5">
        <AccountSettings
          panel={{
            account: null,
            loading: false,
            onCreate: openCreateAccount,
            // Nothing to rename with no account yet — the empty state renders no rename control.
            onRename: () => undefined,
          }}
          details={null}
        />
      </div>
    );
  }

  return (
    <div className="p-5">
      <InlineStatus>Finding your account…</InlineStatus>
    </div>
  );
}
