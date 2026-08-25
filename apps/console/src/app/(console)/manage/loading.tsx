'use client';

import { ManageProjectsLedger } from '@lightbridge/ui-web/src/sections/manage-projects-ledger';
import { ScreenHeading } from '@lightbridge/ui-web/src/sections/screen-heading';

const noop = () => {};

/**
 * `/manage` centre loading skeleton — see `(console)/loading.tsx`'s docstring for why this file
 * exists at all.
 *
 * `ManageProjectsLedger` already renders `LedgerTable`'s row-skeleton geometry when `loading` is
 * set, the same contract `ManageCentre` drives from `screen.loading`.
 */
export default function ManageLoading() {
  return (
    <div className="flex flex-col gap-6">
      <ScreenHeading title="Projects" subline="spend shown month-to-date" />

      <ManageProjectsLedger
        projects={[]}
        loading
        loadingRowCount={8}
        search=""
        onSearchChange={noop}
        onNewProject={noop}
        onSelectRow={noop}
      />
    </div>
  );
}
