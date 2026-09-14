import { Button } from '@lightbridge/ui-web/src/components/button';
import { StatusText } from '@lightbridge/ui-web/src/components/status-text';
import { PageControls } from '@lightbridge/ui-web/src/sections/page-controls';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { approvalTone, repoSlug, type Repository } from '../lib/domain/repos';
import { RepoTabsNav } from './repo-tabs-nav';

/** The way back to the repositories list this page was opened from. A real anchor rather than a
 *  history-pop handler: this page is linkable and routinely arrived at by pasted URL, where
 *  there is no "back" to pop. */
function BackToRepositories() {
  return (
    <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/repositories" />}>
      ← Repositories
    </Button>
  );
}

/**
 * Chrome shared by everything under one repository — the approval status readout and the tab
 * strip that switches between Overview/Graph/Settings.
 *
 * Status is a `PageControls` group on the trailing edge, not `PageHeader.controls` — that slot is
 * gone (owner directive 2026-09-03, "filters are outside cards"; ADR 0015 amendment A2). It lands
 * where `apps/console` puts `DashboardExportButton` — a page-scoped group at the row's trailing
 * edge, `align: 'end'` — because that is exactly what it is: a readout on the SUBJECT of the page,
 * not on any one card in it.
 *
 * The row sits above the tab strip rather than below it, because approval status is a property of
 * the repository and does not change when the reader moves between tabs — a control that outlived
 * the strip it sat under would read as belonging to the active tab.
 */
export function RepositoryShell({
  id,
  repo,
  children,
}: {
  id: number;
  repo: Repository;
  children: ReactNode;
}) {
  const { tone, label } = approvalTone(repo);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={repoSlug(repo)} action={<BackToRepositories />} />

      <PageControls
        label="Repository controls"
        groups={[
          {
            id: 'approval',
            label: 'Approval',
            align: 'end',
            children: (
              <StatusText tone={tone} className="self-center">
                {label}
              </StatusText>
            ),
          },
        ]}
      />

      <RepoTabsNav id={id} />
      {children}
    </div>
  );
}
