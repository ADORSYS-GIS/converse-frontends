'use client';

import { ErrorLine } from '@lightbridge/ui-web/src/components/error-line';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { useAccountId } from '../../../../../client/use-account-id';
import { useConsoleScope } from '../../../../../client/use-console-scope';

/**
 * `/settings/accounts/[accountId]/*` — this subtree's own guard (IA v3 phase E), the identical
 * "is this a real, visible-to-you account id" check `accounts/[accountId]/layout.tsx` runs for
 * the account area (see that file's own doc comment for the full reasoning — every argument there
 * applies verbatim here, only the "back to" destination differs).
 *
 * `useAccountId()` works unchanged in this subtree even though it lives under `/settings`, not
 * `/accounts`: it only reads a dynamic segment named `accountId` off `useParams()`, and this
 * route group names its own segment the same way — the two `[accountId]` trees share the id
 * vocabulary without sharing a route, so every hook that reads scope through `useConsoleScope()`
 * (which resolves the SAME path segment generically) keeps working here with no changes at all.
 *
 * **Gated on SETTLED data only — never while loading**, same as the account area's own guard.
 */
export default function SettingsAccountDetailLayout({ children }: { children: ReactNode }) {
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
              <Link href="/settings/accounts" className="text-ink underline underline-offset-2">
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
