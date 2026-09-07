import { Card } from '@lightbridge/ui-web/src/components/card';
import { ErrorLine } from '@lightbridge/ui-web/src/components/error-line';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';

import type { ResolvedSettings } from '../lib/server/admin';
import type { ApiResult } from '../lib/server/api';
import { RepoSettingsForm } from './repo-settings-form';

/** Repository settings tab: the six review-behaviour settings (check-run reporting, review
 *  triggers, push-storm handling, finding-suppression scope), each showing whether it's on its
 *  default, set by the repo's own config file, or overridden by an admin. */
export function RepositorySettingsCentre({
  id,
  result,
  canConfigure,
}: {
  id: number;
  result: ApiResult<{ settings: ResolvedSettings }>;
  canConfigure: boolean;
}) {
  if (!result.ok) {
    return (
      <Card>
        <ErrorLine
          message={
            result.reason === 'unauthenticated'
              ? "Your session can't reach the control plane. Sign in again."
              : result.reason === 'unavailable'
                ? 'The control plane is unreachable right now.'
                : `Couldn't load settings${result.status ? ` (HTTP ${result.status})` : ''}.`
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
        <RepoSettingsForm id={id} settings={result.data.settings} canConfigure={canConfigure} />
      </Card>
    </div>
  );
}
