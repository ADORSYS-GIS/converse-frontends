import { StatusText } from '@lightbridge/ui-web/src/components/status-text';
import { PageControls } from '@lightbridge/ui-web/src/sections/page-controls';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import type { ReactNode } from 'react';

import { approvalTone, repoSlug, type Repository } from '../lib/domain/repos';
import { RepoTabsNav } from './repo-tabs-nav';

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
      <PageHeader title={repoSlug(repo)} />

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
