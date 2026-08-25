'use client';

import { RailPanel } from '@lightbridge/ui-web/src/components/rail-panel';
import { SubNav } from '@lightbridge/ui-web/src/components/sub-nav';

import { useAdminScreen } from './use-admin-screen';

/**
 * `/admin`'s left-rail secondary section — the ADMIN sub-nav, with its live pending count read
 * from the same queue query the centre and rail use.
 */
export function AdminSubNav() {
  const screen = useAdminScreen();

  return (
    <RailPanel label="ADMIN">
      <SubNav
        items={[
          { key: 'refills', label: 'Refill requests', count: screen.pendingCount, active: true },
        ]}
      />
    </RailPanel>
  );
}
