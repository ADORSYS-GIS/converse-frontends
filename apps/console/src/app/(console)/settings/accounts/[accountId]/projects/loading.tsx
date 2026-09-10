'use client';

import { Card } from '@lightbridge/ui-web/src/components/card';
import { ProjectsLedger } from '@lightbridge/ui-web/src/sections/projects-ledger';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

import { useTranslation } from '../../../../../../i18n/client';

const noop = () => {};

/**
 * `/projects` centre loading skeleton — see `(console)/loading.tsx`'s docstring for why this file
 * exists at all.
 *
 * `ProjectsLedger` already renders `LedgerTable`'s row-skeleton geometry when `loading` is set,
 * the same contract `ProjectsCentre` drives from `screen.loading`.
 */
export default function ProjectsLoading() {
  const { t } = useTranslation('settings');
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('accounts.projects.title')} subtitle={t('accounts.projects.loading')} />

      <Card>
        <ProjectsLedger projects={[]} loading loadingRowCount={8} onSelectRow={noop} />
      </Card>
    </div>
  );
}
