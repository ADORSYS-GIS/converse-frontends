'use client';

import { Card } from '@lightbridge/ui-web/src/components/card';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { SettingsRow } from '@lightbridge/ui-web/src/components/settings-row';
import { resolveConsoleTheme } from '@lightbridge/ui-web/src/lib/theme';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

import { useConsoleSession } from '../client/session-context';
import { useConsoleTheme } from '../client/use-console-theme';
import { useOnlineStatus } from '../client/use-online-status';

/**
 * `/settings/info` — the client half: everything that is genuinely client-only state (identity,
 * theme, connectivity) plus the two server-resolved facts `settings/info/page.tsx` passes down.
 *
 * **Base paths, never full URLs** (the deliverable's own wording): `/api`, `/api/budget`,
 * `/api/usage` are the literal, hardcoded same-origin proxy paths `client/rpc-clients.ts`
 * (`basePath: '/api'` / `'/api/budget'`) and `client/usage-client.ts` (`/api/usage`) already use —
 * mirrored here as constants rather than imported, since importing either module for a string
 * literal would pull their real RPC-client/fetch machinery into this screen for nothing. The
 * actual backend origins those paths proxy TO (`ConsoleEnv.backendUrl`/`budgetUrl`/`usageUrl`) are
 * exactly what this screen must NOT show — internal hostnames are not secrets in the strictest
 * sense, but they are not the console's business to print either, and `usageUrl`'s mere PRESENCE
 * (not its value) is the one fact from that set this screen does surface, resolved server-side
 * (`settings/info/page.tsx`).
 *
 * **No backend-version row** — no endpoint exists to answer it (lightbridge-authz#573, filed from
 * this phase's own work). Omitted with an `InlineStatus` naming the gap, never a fabricated or
 * permanently-null value (console-ui skill's "never fabricate" states clause).
 */

const BASE_PATHS = {
  backend: '/api',
  budget: '/api/budget',
  usage: '/api/usage',
};

export function InfoCentre({
  consoleVersion,
  usageConfigured,
}: {
  consoleVersion: string;
  usageConfigured: boolean;
}) {
  const session = useConsoleSession();
  const online = useOnlineStatus();
  const { preference } = useConsoleTheme();
  const buildSha = process.env.NEXT_PUBLIC_BUILD_SHA;

  const roles = session.user?.roles ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Info" subtitle="Build, configuration and session diagnostics" />

      <Card title="Console build">
        <div className="settings-list">
          <SettingsRow label="Console version" value={consoleVersion} valueKind="data" />
          {/* Omitted entirely, never a fabricated placeholder, when unset — no build pipeline
              sets `NEXT_PUBLIC_BUILD_SHA` for every deployment target yet. */}
          {buildSha ? <SettingsRow label="Build SHA" value={buildSha} valueKind="data" /> : null}
        </div>
      </Card>

      <Card title="Backend configuration">
        <div className="settings-list">
          <SettingsRow label="Backend API path" value={BASE_PATHS.backend} valueKind="data" />
          <SettingsRow label="Budget API path" value={BASE_PATHS.budget} valueKind="data" />
          <SettingsRow
            label="Usage backend"
            value={usageConfigured ? BASE_PATHS.usage : 'Not configured'}
            valueKind={usageConfigured ? 'data' : 'text'}
            valueMuted={!usageConfigured}
          />
        </div>
        <InlineStatus className="mt-4">
          Backend version has no read endpoint yet (lightbridge-authz#573).
        </InlineStatus>
      </Card>

      <Card title="Session">
        <div className="settings-list">
          <SettingsRow
            label="Signed in as"
            value={
              session.user?.email ?? session.user?.preferredUsername ?? session.user?.name ?? '—'
            }
          />
          <SettingsRow label="Subject" value={session.user?.sub ?? '—'} valueKind="data" />
          <SettingsRow label="Roles" value={roles.length > 0 ? roles.join(', ') : 'None'} />
        </div>
      </Card>

      <Card title="Client state">
        <div className="settings-list">
          <SettingsRow label="Theme preference" value={preference} />
          <SettingsRow label="Active theme" value={resolveConsoleTheme(preference)} />
          <SettingsRow label="Connectivity" value={online ? 'Online' : 'Offline · cached data'} />
        </div>
      </Card>
    </div>
  );
}
