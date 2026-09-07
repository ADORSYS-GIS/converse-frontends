import { Card } from '@lightbridge/ui-web/src/components/card';
import { ErrorLine } from '@lightbridge/ui-web/src/components/error-line';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { RepositoryShell } from '../../../../containers/repository-shell';
import { getAdminRepo } from '../../../../lib/server/admin';

export const dynamic = 'force-dynamic';

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

  const repoResult = await getAdminRepo(id);
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

  return (
    <RepositoryShell id={id} repo={repo}>
      {children}
    </RepositoryShell>
  );
}
