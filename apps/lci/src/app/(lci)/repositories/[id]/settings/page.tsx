import { Card } from '@lightbridge/ui-web/src/components/card';
import { ErrorLine } from '@lightbridge/ui-web/src/components/error-line';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { notFound } from 'next/navigation';

import { RepoSettingsForm } from '../../../../../client/repo-settings-form';
import { getRepoSettings, hasPermission } from '../../../../../lib/server/admin';
import { currentClaims } from '../../../../../lib/server/session';

export const dynamic = 'force-dynamic';

/** Repository settings tab — the six review-behaviour settings (check-run reporting, review
 *  triggers, push-storm handling, finding-suppression scope), each showing whether it's on its
 *  default, set by the repo's own config file, or overridden by an admin. */
export default async function RepositorySettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [settingsResult, claims] = await Promise.all([getRepoSettings(id), currentClaims()]);
  const canConfigure = hasPermission(claims, 'repo:configure');

  if (!settingsResult.ok) {
    return (
      <Card>
        <ErrorLine
          message={
            settingsResult.reason === 'unauthenticated'
              ? "Your session can't reach the control plane. Sign in again."
              : settingsResult.reason === 'unavailable'
                ? 'The control plane is unreachable right now.'
                : `Couldn't load settings${settingsResult.status ? ` (HTTP ${settingsResult.status})` : ''}.`
          }
        />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {!canConfigure ? (
        <InlineStatus>Read-only — you don&apos;t have repo:configure permission.</InlineStatus>
      ) : null}
      <Card title="Review behaviour">
        <RepoSettingsForm
          id={id}
          settings={settingsResult.data.settings}
          canConfigure={canConfigure}
        />
      </Card>
    </div>
  );
}
