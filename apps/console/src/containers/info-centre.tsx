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
import { useTranslation } from '../i18n/client';
import { LocaleSwitcher } from '../i18n/locale-switcher';
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
  const { t } = useTranslation('settings');
  const session = useConsoleSession();
  const online = useOnlineStatus();
  const { preference } = useConsoleTheme();
  const backends = useBuildInfo();

  const roles = session.user?.roles ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('info.title')} subtitle={t('info.subtitle')} />

      {/* Replaces the old "Console build" card outright: that card answered half the question
          (this app's own version and SHA) and the screen then had to admit, in an `InlineStatus`,
          that it could say nothing about the other half. One card now answers both, with the
          console's own row first — the reference point a reader compares the rest against. */}
      <BuildInfoCard
        entries={[
          {
            id: 'console',
            label: t('info.console-entry.label'),
            description: t('info.console-entry.description'),
            state: { status: 'ready', facts: consoleBuild },
          },
          ...backends.entries,
        ]}
      />

      <Card title={t('info.backend.title')}>
        <div className="settings-list">
          <SettingsRow
            label={t('info.backend.backend-path')}
            value={BASE_PATHS.backend}
            valueKind="data"
          />
          <SettingsRow
            label={t('info.backend.budget-path')}
            value={BASE_PATHS.budget}
            valueKind="data"
          />
          <SettingsRow
            label={t('info.backend.usage-backend')}
            value={usageConfigured ? BASE_PATHS.usage : t('info.backend.not-configured')}
            valueKind={usageConfigured ? 'data' : 'text'}
            valueMuted={!usageConfigured}
          />
        </div>
      </Card>

      <Card title={t('info.session.title')}>
        <div className="settings-list">
          <SettingsRow
            label={t('info.session.signed-in-as')}
            value={
              session.user?.email ?? session.user?.preferredUsername ?? session.user?.name ?? '—'
            }
          />
          <SettingsRow
            label={t('info.session.subject')}
            value={session.user?.sub ?? '—'}
            valueKind="data"
          />
          <SettingsRow
            label={t('info.session.roles')}
            value={roles.length > 0 ? roles.join(', ') : t('info.session.no-roles')}
          />
        </div>
      </Card>

      <Card title={t('info.client.title')}>
        <div className="settings-list">
          <SettingsRow label={t('info.client.theme-preference')} value={preference} />
          <SettingsRow
            label={t('info.client.active-theme')}
            value={resolveConsoleTheme(preference)}
          />
          {/* The SECOND home of the language control (ADR 0017), beside the theme and connectivity
              readings it belongs with. The sidebar's own row is the one a person reaches for; this
              is where they come to see what this browser currently thinks — so it is a live
              control here too rather than a printed value, for the same reason the theme row above
              is not a read-only string either. `SettingsRow` renders a `value` slot, so the
              switcher goes in it. */}
          <SettingsRow label={t('info.client.language')} value={<LocaleSwitcher />} />
          <SettingsRow
            label={t('info.client.connectivity')}
            value={online ? t('info.client.online') : t('info.client.offline')}
          />
        </div>
      </Card>
    </div>
  );
}
