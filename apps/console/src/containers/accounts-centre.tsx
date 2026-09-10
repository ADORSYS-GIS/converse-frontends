'use client';

import { Button } from '@lightbridge/ui-web/src/components/button';
import { Card } from '@lightbridge/ui-web/src/components/card';
import { AccountDirectory } from '@lightbridge/ui-web/src/sections/account-directory';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

import { useTranslation } from '../i18n/client';
import { useOpenCreateAccountDialog } from './use-create-account-dialog';
import { useAccountsScreen } from './use-accounts-screen';

/**
 * `/settings/accounts` — the identity's account family (IA v3 phase E, owner: "add
 * /settings/accounts"). Two things, both moved off `/settings/policies` this phase:
 *
 *  1. `AccountDirectory` — one row per account, each linking to `/settings/accounts/<id>`.
 *  2. `+ New account` — the `PageHeader` action, opening the SAME shared, cross-route
 *     `AccountNameDialog` instance the workspace switcher's own `+ New account` row opens
 *     (`use-create-account-dialog.ts`, mounted once in `app/(console)/layout.tsx`).
 */
export function AccountsCentre() {
  const { t } = useTranslation('settings');
  const screen = useAccountsScreen();
  const openCreateAccount = useOpenCreateAccountDialog();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('accounts.title')}
        subtitle={
          // i18next's own plural resolution (`accounts.count_one`/`_other`), not a hand-rolled
          // `=== 1 ? '' : 's'`: German pluralises on a different rule from English, and a suffix
          // appended in JSX is a rule this file would be asserting on the bundle's behalf.
          screen.accountCount > 0 ? t('accounts.count', { count: screen.accountCount }) : undefined
        }
        action={
          <Button type="button" variant="primary" onClick={openCreateAccount}>
            {t('accounts.new-account')}
          </Button>
        }
      />

      <Card>
        <AccountDirectory {...screen.directory} />
      </Card>
    </div>
  );
}
