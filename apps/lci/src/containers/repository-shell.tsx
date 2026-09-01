import { Button } from '@lightbridge/ui-web/src/components/button';
import { StatusText } from '@lightbridge/ui-web/src/components/status-text';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import type { ReactNode } from 'react';

import { approvalTone, repoSlug, type Repository } from '../lib/domain/repos';
import { approveRepoAction, denyRepoAction } from './repository-actions';
import { RepoTabsNav } from './repo-tabs-nav';

/** Chrome shared by everything under one repository — the title row carries the approval status
 *  and approve/deny actions, since they act on the repository itself and stay reachable from
 *  every tab, and the tab strip switches between Overview/Graph/Settings. */
export function RepositoryShell({
  id,
  repo,
  canApprove,
  canDeny,
  children,
}: {
  id: number;
  repo: Repository;
  canApprove: boolean;
  canDeny: boolean;
  children: ReactNode;
}) {
  const { tone, label } = approvalTone(repo);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={repoSlug(repo)}
        controls={
          <div className="flex items-center gap-3">
            <StatusText tone={tone}>{label}</StatusText>
            {canApprove && repo.status !== 'approved' ? (
              <form action={approveRepoAction}>
                <input type="hidden" name="id" value={id} />
                <Button type="submit" variant="primary" size="sm">
                  Approve
                </Button>
              </form>
            ) : null}
            {canDeny && repo.status !== 'disabled' ? (
              <form action={denyRepoAction}>
                <input type="hidden" name="id" value={id} />
                <Button type="submit" variant="ghost" size="sm">
                  Deny
                </Button>
              </form>
            ) : null}
          </div>
        }
      />
      <RepoTabsNav id={id} />
      {children}
    </div>
  );
}
