import { Button } from '@lightbridge/ui-web/src/components/button';
import { Card } from '@lightbridge/ui-web/src/components/card';
import { SettingsRow } from '@lightbridge/ui-web/src/components/settings-row';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

import type { SessionClaims } from '../lib/auth';
import { displayName } from '../lib/server/session';

/** GitHub App install URL — env-configurable, falls back to the registered app so it works out
 *  of the box. */
function githubAppInstallUrl(): string {
  // `globalThis.process?.`, not a bare `process.`: this is a client component, and it renders in
  // one environment where `process` is genuinely undefined — the Storybook browser-mode a11y run
  // (`packages/ui-web/vitest.storybook.config.mts`), where all five of this file's stories died
  // with `ReferenceError: process is not defined`. Next inlines the value at build time in the
  // real app, so nothing about production behaviour changes.
  return (
    globalThis.process?.env?.GITHUB_APP_INSTALL_URL ??
    'https://github.com/apps/lightbridge-assistant'
  );
}

/** App-level settings: account identity, GitHub App install link, and granted permissions.
 *  Read-only — identity is Keycloak's, not this app's, to manage. */
export function SettingsCentre({
  claims,
  perms,
}: {
  claims: SessionClaims | null;
  perms: string[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        subtitle="Your account. Identity is managed by Keycloak (OIDC) — Lightbridge stores no credentials."
      />

      <Card title="Account">
        {claims ? (
          <>
            <SettingsRow label="Name" value={displayName(claims)} />
            <SettingsRow label="Email" value={claims.email ?? '—'} valueMuted={!claims.email} />
            <SettingsRow
              label="Username"
              value={claims.preferred_username ?? '—'}
              valueMuted={!claims.preferred_username}
            />
            <SettingsRow label="Subject" value={claims.sub} valueKind="data" />
          </>
        ) : (
          <SettingsRow label="Not signed in" value="—" valueMuted />
        )}
      </Card>

      <Card title="GitHub App">
        <SettingsRow
          label="Installation"
          description="Lightbridge reviews via a GitHub App. Manage its installation, repository access, and permissions on its public page."
          action={
            <Button
              variant="secondary"
              size="sm"
              render={
                // Base UI `render` takes a template that is cloned WITH this Button's children —
                // see `packages/ui-web/src/components/button/component.tsx`'s note on these rules.
                // eslint-disable-next-line jsx-a11y/anchor-has-content, jsx-a11y/control-has-associated-label
                <a href={githubAppInstallUrl()} target="_blank" rel="noopener noreferrer" />
              }
              nativeButton={false}>
              Open
            </Button>
          }
        />
      </Card>

      <Card title="Access">
        <SettingsRow
          label="Permissions"
          description="Granted by the permissions in your identity token and managed by your identity provider — there is nothing to configure here."
          value={perms.length === 0 ? 'No permissions in your token' : perms.join(', ')}
          valueMuted={perms.length === 0}
          valueKind={perms.length === 0 ? 'text' : 'data'}
        />
      </Card>

      <Card title="Indexing">
        <SettingsRow
          label="Automatic indexing"
          description="Repositories are indexed automatically once approved. Per-repository index health appears on the Repositories page."
          action={
            <Button
              variant="secondary"
              size="sm"
              render={
                // Base UI `render` takes a template that is cloned WITH this Button's children —
                // see `packages/ui-web/src/components/button/component.tsx`'s note on these rules.
                // eslint-disable-next-line jsx-a11y/anchor-has-content, jsx-a11y/control-has-associated-label
                <a href="/repositories" />
              }
              nativeButton={false}>
              Repositories
            </Button>
          }
        />
      </Card>

      <div>
        <Button
          variant="secondary"
          render={
            // Base UI `render` takes a template that is cloned WITH this Button's children — see
            // `packages/ui-web/src/components/button/component.tsx`'s note on these two rules.
            // eslint-disable-next-line jsx-a11y/anchor-has-content, jsx-a11y/control-has-associated-label
            <a href="/api/auth/logout" />
          }
          nativeButton={false}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
