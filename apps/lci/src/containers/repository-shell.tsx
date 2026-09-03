import { Button } from '@lightbridge/ui-web/src/components/button';
import { StatusText } from '@lightbridge/ui-web/src/components/status-text';
import { PageControls } from '@lightbridge/ui-web/src/sections/page-controls';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import type { ReactNode } from 'react';

import { approvalTone, repoSlug, type Repository } from '../lib/domain/repos';
import { approveRepoAction, denyRepoAction } from './repository-actions';
import { RepoTabsNav } from './repo-tabs-nav';

/**
 * Chrome shared by everything under one repository — the approval status and the approve/deny
 * actions (they act on the repository itself, so they stay reachable from every tab), and the tab
 * strip that switches between Overview/Graph/Settings.
 *
 * Approval is a `PageControls` group on the trailing edge, not `PageHeader.controls` — that slot
 * is gone (owner directive 2026-09-03, "filters are outside cards"; ADR 0015 amendment A2). The
 * title row is a title and at most ONE action, and this cluster is three things: a state readout
 * and two forms. It lands where `apps/console` puts `DashboardExportButton` — a page-scoped group
 * at the row's trailing edge, `align: 'end'` — because that is exactly what it is: an action on
 * the SUBJECT of the page, not on any one card in it.
 *
 * The row sits above the tab strip rather than below it, because approval is a property of the
 * repository and does not change when the reader moves between tabs — a control that outlived the
 * strip it sat under would read as belonging to the active tab.
 */
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
      <PageHeader title={repoSlug(repo)} />

      <PageControls
        label="Repository controls"
        groups={[
          {
            id: 'approval',
            label: 'Approval',
            align: 'end',
            children: (
              <>
                {/* `self-center`: the row aligns its groups on their BOTTOM edge, which is right
                    for two controls of different heights and wrong for a bare line of text beside
                    a button — the text's descender line would sit level with the button's border
                    and read as if it had slipped. */}
                <StatusText tone={tone} className="self-center">
                  {label}
                </StatusText>
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
              </>
            ),
          },
        ]}
      />

      <RepoTabsNav id={id} />
      {children}
    </div>
  );
}
