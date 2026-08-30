'use client';

import type { Project } from '@lightbridge/authz-rpc';
// Subpath import, not the package barrel — see `use-settings-screen.ts`'s own note (this file's
// predecessor) on why, still true: several `ui-web` agents work in parallel, and for TYPE-only
// imports the choice is free (they erase at compile time).
import type { AccountSettingsProps } from '@lightbridge/ui-web/src/sections/account-settings';
import { useList } from '@refinedev/core';

import { useConsoleScope } from '../client/use-console-scope';
import { accountScopeLabel } from './account-label';
import { useOpenRenameAccountDialog } from './use-rename-account-dialog';

/**
 * `/settings/account` — the account identity screen's data adapter, shared by its centre
 * (`account-settings-centre.tsx`) and the horizontal `SettingsSubNav` above it (for the
 * `Projects` tab's own trailing count).
 *
 * The split from the old, single `use-settings-screen.ts` (phase 6, admin/settings revamp — Attio
 * pattern, real routes) mirrors the route split: `/settings` redirects to `/settings/account`,
 * and `/settings/projects` is a genuinely separate route with its own data now, not a second
 * section stacked under the same header.
 *
 * ADR-0026 (lightbridge-authz#564, "one identity may own many accounts") reshaped what this hook
 * owns, and the rail-return round (Addition C, 2026-08-30) reshaped it again: the SCOPED account
 * write itself — the `AccountNameDialog` (`mode: 'rename'`) and its `updateAccountName` mutation —
 * moved OUT entirely, to `use-rename-account-dialog.ts`, mounted once in
 * `app/(console)/layout.tsx`. This screen renders neither any more; it only calls
 * `useOpenRenameAccountDialog()` for its own row action, the same lightweight trigger the
 * inspector rail's quick-settings panel calls from every other route — the "+ New account"
 * precedent (`use-create-account-dialog.ts`) applied to its sibling verb.
 *
 * `projectCount` is a lightweight `pageSize: 1` listing purely for the tab's own trailing count
 * (`use-projects-screen.ts`'s own `projects` query in `use-overview-screen.ts` uses the identical
 * pattern) — the full, paginated project list lives in `use-project-settings-screen.ts` instead.
 */

export interface AccountSettingsScreen {
  /** The scoped account's display label (`accountScopeLabel`), for `PageHeader.subtitle`. */
  scopeLabel: string | undefined;
  accountSettings: AccountSettingsProps;
  /** The account's project count, for `SettingsSubNav`'s `Projects` tab. */
  projectCount: number;
}

export function useAccountSettingsScreen(): AccountSettingsScreen {
  const scope = useConsoleScope();
  const openRenameAccountDialog = useOpenRenameAccountDialog();

  const projectCountList = useList<Project>({
    resource: 'projects',
    pagination: { currentPage: 1, pageSize: 1 },
    filters: scope.value.accountId
      ? [{ field: 'accountId', operator: 'eq' as const, value: scope.value.accountId }]
      : [],
  });

  /**
   * The account this screen is about: whichever one the workspace switcher has scoped, not the
   * signed-in principal's home account. `scope.allAccounts` is already the backend's own answer
   * to "which accounts can this identity read" (`authz.cstack`'s owner-only `@@allow` on
   * `Account`), so a hit here already carries ownership.
   */
  const scopedAccount =
    scope.allAccounts.find((account) => account.id === scope.value.accountId) ?? null;

  const accountSettings: AccountSettingsProps = {
    panel: {
      account:
        scopedAccount === null ? null : { id: scopedAccount.id, name: scopedAccount.name ?? null },
      loading: scope.loading,
      error: scope.error ? 'Could not load your account.' : undefined,
      onRetry: () => scope.refetch(),
      // The empty state's own CTA — no scoped account at all yet (a brand-new identity with zero
      // accounts) — opens the SAME shared create dialog the `PageHeader` action and the workspace
      // switcher do; see `account-settings-centre.tsx` for the wiring.
      onCreate: () => undefined,
      onRename: openRenameAccountDialog,
    },
    // `null` while loading or on a failed fetch as well as for "no account": the panel above has
    // already said which of the three it is, and a `status` row would claim a fourth.
    details:
      scopedAccount === null || scope.loading || scope.error
        ? null
        : {
            id: scopedAccount.id,
            status: scopedAccount.status,
            defaultQuotaTier: scopedAccount.defaultQuota ?? null,
          },
    onCopyId: (accountId: string) => {
      // Best-effort, same contract as the header's `AccountBadge`: `navigator.clipboard` is
      // undefined on insecure origins, and a failed copy leaves the id on screen to select by
      // hand, so there is nothing to recover.
      void navigator.clipboard?.writeText?.(accountId).catch(() => undefined);
    },
  };

  return {
    scopeLabel: scopedAccount ? accountScopeLabel(scopedAccount) : undefined,
    accountSettings,
    projectCount: projectCountList.result.total ?? 0,
  };
}
