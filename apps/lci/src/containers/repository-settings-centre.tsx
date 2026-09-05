import { Button } from '@lightbridge/ui-web/src/components/button';
import { Card } from '@lightbridge/ui-web/src/components/card';
import { ErrorLine } from '@lightbridge/ui-web/src/components/error-line';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';

import type { Repository } from '../lib/domain/repos';
import type { ResolvedSettings } from '../lib/server/admin';
import type { ApiResult } from '../lib/server/api';
import { denyRepoAction } from './repository-actions';
import { RepoSettingsForm } from './repo-settings-form';

/** Repository settings tab: the six review-behaviour settings (check-run reporting, review
 *  triggers, push-storm handling, finding-suppression scope), each showing whether it's on its
 *  default, set by the repo's own config file, or overridden by an admin — plus, at the bottom, a
 *  "Danger zone" carrying the repo's own deny action. Deny lives here rather than as a one-click
 *  header button (`RepositoryShell`'s header links here instead) because it revokes review access
 *  outright, and a destructive action belongs somewhere you have to deliberately navigate to, not
 *  a button sitting next to routine status text on every tab. */
export function RepositorySettingsCentre({
  id,
  result,
  canConfigure,
  repo,
  canDeny,
}: {
  id: number;
  result: ApiResult<{ settings: ResolvedSettings }>;
  canConfigure: boolean;
  repo: Repository | null;
  canDeny: boolean;
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
      {canDeny && repo && repo.status !== 'disabled' ? (
        <Card title="Danger zone" id="danger">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Deny this repository</p>
              <p className="text-subtle text-sm">
                Revokes review access. Can be re-approved later from Approvals.
              </p>
            </div>
            <form action={denyRepoAction}>
              <input type="hidden" name="id" value={id} />
              <Button type="submit" variant="secondary" size="sm">
                Deny repository
              </Button>
            </form>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
