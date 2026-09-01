'use client';

import { ErrorLine } from '@lightbridge/ui-web/src/components/error-line';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { useAccountId } from '../../../../client/use-account-id';
import { useConsoleScope } from '../../../../client/use-console-scope';

/**
 * `/accounts/[accountId]/*` — the account-scoped route group's own guard (IA v3 phase 1, "account
 * into the path").
 *
 * Every screen under this segment assumes `useAccountId()` names an account the signed-in
 * identity can actually see — true for every link this console itself ever mints (the `/`
 * resolver only ever redirects into an id it just read off the settled accounts list, and the
 * workspace switcher only ever navigates to an id already in `allAccounts`), but not necessarily
 * true for a bookmarked, hand-edited, or stale URL. This layout is where that gets checked, once,
 * for every screen underneath it.
 *
 * **Gated on SETTLED data only — never while loading.** `useConsoleScope().allAccounts` starts
 * empty before the accounts query resolves, and an empty list is not evidence of anything: reading
 * it before it settles would flash this error on every single page load, the exact "false empty"
 * class of bug the console-ui skill's states section calls out for `EmptyState`. `scope.loading`
 * is checked first for that reason, and `scope.error` (the query itself failing) is treated as
 * "not disproven" rather than "not found" — a failed query says nothing about whether the account
 * exists, so it renders the account's own screens rather than a false-negative "not found."
 */
export default function AccountLayout({ children }: { children: ReactNode }) {
  // The strict hook, called directly rather than through `scope.value.accountId`: this layout IS
  // the one place in the tree that gets to assert "this is definitely `/accounts/[accountId]/*`"
  // — every screen underneath imports it transitively through `useConsoleScope()` instead, which
  // degrades gracefully off this path (see that hook's own doc comment) precisely because it is
  // also called from route branches that are NOT this one.
  const accountId = useAccountId();
  const scope = useConsoleScope();

  const settled = !scope.loading && !scope.error;
  const knownAccount = scope.allAccounts.some((account) => account.id === accountId);

  if (settled && !knownAccount) {
    return (
      <div className="p-5">
        <ErrorLine
          message={
            <>
              This account isn&rsquo;t available to you.{' '}
              <Link href="/" className="text-ink underline underline-offset-2">
                Back to your accounts
              </Link>
            </>
          }
        />
      </div>
    );
  }

  return <>{children}</>;
}
