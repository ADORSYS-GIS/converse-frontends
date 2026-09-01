import { Button } from '@lightbridge/ui-web/src/components/button';
import { Card } from '@lightbridge/ui-web/src/components/card';
import { ErrorLine } from '@lightbridge/ui-web/src/components/error-line';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { StatusText } from '@lightbridge/ui-web/src/components/status-text';
import { LABEL_CLASS } from '@lightbridge/ui-web/src/lib/type-roles';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

import { approvalTone, repoSlug, type Repository } from '../../../lib/domain/repos';
import { hasPermission, listAdminRepos } from '../../../lib/server/admin';
import { currentClaims } from '../../../lib/server/session';
import { approveRepoAction, denyRepoAction } from './actions';

export const dynamic = 'force-dynamic';

/** Repository approvals — newly connected repositories stay pending until an approver acts, so
 *  they get indexed and reviewed only once someone has actually vetted them. */
export default async function AdminPage() {
  const claims = await currentClaims();
  const canApprove = hasPermission(claims, 'repo:approve');
  const canDeny = hasPermission(claims, 'repo:deny');

  if (!canApprove && !canDeny) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Repository approvals" />
        <Card>
          <ErrorLine message="You need the repo:approve or repo:deny permission to manage repository approvals. Ask an administrator to grant it." />
        </Card>
      </div>
    );
  }

  const result = await listAdminRepos();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Repository approvals"
        subtitle="Newly added repositories stay pending until approved — only then are they indexed or reviewed. Decisions are reversible: deny an approved repo to take it back out of scope, or approve a denied one to bring it in."
      />

      {!result.ok ? (
        <Card>
          <ErrorLine
            message={
              result.reason === 'unauthenticated'
                ? "Your session can't reach the control plane. Sign in again."
                : result.reason === 'unavailable'
                  ? 'The control plane is unreachable right now.'
                  : `Couldn't load repositories${result.status ? ` (HTTP ${result.status})` : ''}.`
            }
          />
        </Card>
      ) : (
        <RepoSections repos={result.data} canApprove={canApprove} canDeny={canDeny} />
      )}
    </div>
  );
}

function RepoSections({
  repos,
  canApprove,
  canDeny,
}: {
  repos: Repository[];
  canApprove: boolean;
  canDeny: boolean;
}) {
  const pending = repos.filter((r) => r.status === 'pending');
  const approved = repos.filter((r) => r.status === 'approved');
  const disabled = repos.filter((r) => r.status === 'disabled');

  return (
    <div className="flex flex-col gap-6">
      <Section
        title="Pending"
        repos={pending}
        empty="No repositories are awaiting approval."
        canApprove={canApprove}
        canDeny={canDeny}
      />
      {approved.length > 0 ? (
        <Section title="Approved" repos={approved} canApprove={canApprove} canDeny={canDeny} />
      ) : null}
      {disabled.length > 0 ? (
        <Section title="Denied" repos={disabled} canApprove={canApprove} canDeny={canDeny} />
      ) : null}
    </div>
  );
}

function Section({
  title,
  repos,
  empty,
  canApprove,
  canDeny,
}: {
  title: string;
  repos: Repository[];
  empty?: string;
  canApprove: boolean;
  canDeny: boolean;
}) {
  return (
    <Card title={title}>
      {repos.length === 0 ? (
        <InlineStatus>{empty}</InlineStatus>
      ) : (
        <ul className="divide-raised divide-y">
          {repos.map((repo) => (
            <RepoRow key={repo.id} repo={repo} canApprove={canApprove} canDeny={canDeny} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function RepoRow({
  repo,
  canApprove,
  canDeny,
}: {
  repo: Repository;
  canApprove: boolean;
  canDeny: boolean;
}) {
  const { tone, label } = approvalTone(repo);
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-1 py-3">
      <div className="min-w-0">
        <div className="text-soft truncate text-sm font-medium">{repoSlug(repo)}</div>
        <div className={`${LABEL_CLASS} mt-0.5`}>
          {repo.platform} id {repo.platform_repo_id}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <StatusText tone={tone}>{label}</StatusText>
        {canApprove && repo.status !== 'approved' ? (
          <form action={approveRepoAction}>
            <input type="hidden" name="id" value={repo.id} />
            <Button type="submit" variant="primary" size="sm">
              Approve
            </Button>
          </form>
        ) : null}
        {canDeny && repo.status !== 'disabled' ? (
          <form action={denyRepoAction}>
            <input type="hidden" name="id" value={repo.id} />
            <Button type="submit" variant="ghost" size="sm">
              Deny
            </Button>
          </form>
        ) : null}
      </div>
    </li>
  );
}
