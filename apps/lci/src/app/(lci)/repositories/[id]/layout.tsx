import { Button } from '@lightbridge/ui-web/src/components/button';
import { Card } from '@lightbridge/ui-web/src/components/card';
import { ErrorLine } from '@lightbridge/ui-web/src/components/error-line';
import { StatusText } from '@lightbridge/ui-web/src/components/status-text';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { RepoTabsNav } from '../../../../client/repo-tabs-nav';
import { approvalTone, repoSlug } from '../../../../lib/domain/repos';
import { getAdminRepo, hasPermission } from '../../../../lib/server/admin';
import { currentClaims } from '../../../../lib/server/session';
import { approveRepoAction, denyRepoAction } from './actions';

export const dynamic = 'force-dynamic';

/** Chrome shared by everything under one repository — `PageHeader.controls` carries the
 *  approval status and approve/deny actions, since they act on the repository itself and stay
 *  reachable from every tab, and `RepoTabsNav` switches between Overview/Graph/Settings. */
export default async function RepositoryLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [repoResult, claims] = await Promise.all([getAdminRepo(id), currentClaims()]);
  if (!repoResult.ok) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Repository" />
        <Card>
          <ErrorLine
            message={
              repoResult.reason === 'unauthenticated'
                ? "Your session can't reach the control plane. Sign in again."
                : repoResult.reason === 'unavailable'
                  ? 'The control plane is unreachable right now.'
                  : `Couldn't load this repository${repoResult.status ? ` (HTTP ${repoResult.status})` : ''}.`
            }
          />
        </Card>
      </div>
    );
  }
  const repo = repoResult.data;
  if (!repo) notFound();

  const { tone, label } = approvalTone(repo);
  const canApprove = hasPermission(claims, 'repo:approve');
  const canDeny = hasPermission(claims, 'repo:deny');

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
