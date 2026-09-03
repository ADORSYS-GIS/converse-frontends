'use client';

import { Card } from '@lightbridge/ui-web/src/components/card';
import { SettingsRow } from '@lightbridge/ui-web/src/components/settings-row';
import { resolveConsoleTheme } from '@lightbridge/ui-web/src/lib/theme';
import { BuildInfoCard } from '@lightbridge/ui-web/src/sections/build-info-card';
import type { BuildInfoFacts } from '@lightbridge/ui-web/src/sections/build-info-card';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

import { useConsoleSession } from '../client/session-context';
import { useConsoleTheme } from '../client/use-console-theme';
import { useOnlineStatus } from '../client/use-online-status';
import { useBuildInfo } from './use-build-info';

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
 * **The backend-version gap is closed** (lightbridge-authz#573, filed from this phase's own work
 * and shipped in lightbridge-authz PR #663). The `InlineStatus` that used to name the gap is gone
 * — a hard cutover, not a fallback beside the real thing — replaced by the `Platform` card, which
 * reports the console's own build stamp beside every backend's. `useBuildInfo` fetches; this view
 * only prepends the console's own entry, which comes from server props rather than a query because
 * a build stamp compiled into this very bundle cannot be fetched from anywhere.
 */

const BASE_PATHS = {
  backend: '/api',
  budget: '/api/budget',
  usage: '/api/usage',
};

export function InfoCentre({
  consoleBuild,
  usageConfigured,
}: {
  /**
   * The console's OWN build stamp, resolved server-side (`server/build-info.ts`'s
   * `consoleBuildFacts`): package version, the commit `next build` inlined, and the image
   * identity the Dockerfile promoted out of build-args. Passed as a prop rather than read here
   * because two of the three are server-only environment variables — only `NEXT_PUBLIC_BUILD_SHA`
   * would survive into the bundle, and reading one of three in one place and two in another is
   * how a screen ends up reporting a half-truth.
   */
  consoleBuild: BuildInfoFacts;
  usageConfigured: boolean;
}) {
  const session = useConsoleSession();
  const online = useOnlineStatus();
  const { preference } = useConsoleTheme();
  const backends = useBuildInfo();

  const roles = session.user?.roles ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Info" subtitle="Build, configuration and session diagnostics" />

      {/* Replaces the old "Console build" card outright: that card answered half the question
          (this app's own version and SHA) and the screen then had to admit, in an `InlineStatus`,
          that it could say nothing about the other half. One card now answers both, with the
          console's own row first — the reference point a reader compares the rest against. */}
      <BuildInfoCard
        entries={[
          {
            id: 'console',
            label: 'Console',
            description: 'this app',
            state: { status: 'ready', facts: consoleBuild },
          },
          ...backends.entries,
        ]}
      />

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
