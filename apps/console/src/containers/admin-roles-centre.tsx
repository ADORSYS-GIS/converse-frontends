'use client';

import { Button } from '@lightbridge/ui-web/src/components/button';
import { Card } from '@lightbridge/ui-web/src/components/card';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import {
  GrantRoleDialog,
  PlatformRoleGrants,
  RevokeRoleDialog,
} from '@lightbridge/ui-web/src/sections/platform-role-grants';

import { useTranslation } from '../i18n/client';
import { useAdminRolesScreen } from './use-admin-roles-screen';

/**
 * `/admin/roles` — the centre column, and the WHOLE of this route (converse-frontends#452,
 * story C9). Reached from the admin area's own "Roles" nav row, or from the settings area's
 * "Roles" row, which stopped being a `disabled` placeholder the moment
 * `listPlatformRoleGrants`/`grantPlatformRole`/`revokePlatformRole` became real
 * (lightbridge-authz#656).
 *
 * The shell is NOT here — it is mounted once by `app/(console)/layout.tsx`.
 *
 * One `Card` holding toolbar + table + pager (the split `ProjectsLedger`/`ReviewQueue` established:
 * the section supplies the contents, this file supplies the card), with "Grant role" in
 * `PageHeader.action` — the screen's one primary, the same slot `+ New key` uses.
 *
 * **The subtitle states the propagation rule, permanently, not only after a mutation.** A grant
 * reaches its holder at their next token mint (`ClaimSource::PlatformRoles` stamps the claim at
 * mint, ADR-0014's precedent), which is the single most surprising property of this screen: an
 * operator who grants a role and then watches the person still be refused for a few minutes has
 * not hit a bug. Saying it once in the header, and again in each dialog, is cheaper than the
 * support conversation.
 *
 * The mutation outcome is an `InlineStatus` under the header, not a toast: the console has no
 * toast pattern (ADR 0008), and a revocation's `revokedSessionCount` is a fact worth leaving on
 * screen rather than one that fades after four seconds.
 */
export function AdminRolesCentre() {
  const { t } = useTranslation('admin');
  const screen = useAdminRolesScreen();

  return (
    <>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={t('roles.title')}
          subtitle={t('roles.subtitle')}
          action={
            <Button type="button" variant="primary" onClick={screen.openGrantDialog}>
              {t('roles.grant')}
            </Button>
          }
        />

        {screen.outcome ? <InlineStatus>{screen.outcome}</InlineStatus> : null}

        <Card>
          <PlatformRoleGrants {...screen.ledger} />
        </Card>
      </div>

      {/* Both dialogs are ordinary component calls inside this already-gated tree — never sibling
          route segments that could bypass `roles/page.tsx`'s own `rbac:manage` check. */}
      <GrantRoleDialog {...screen.grantDialog} />
      <RevokeRoleDialog {...screen.revokeDialog} />
    </>
  );
}
