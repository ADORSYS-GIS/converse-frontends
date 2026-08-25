'use client';

import { RailPanel } from '@lightbridge/ui-web/src/components/rail-panel';
import { SubNav } from '@lightbridge/ui-web/src/components/sub-nav';

import { ManageScopeSlot } from './manage-scope-slot';
import { useManageScreen } from './use-manage-screen';

/**
 * `/manage`'s left-rail secondary section — the MANAGE sub-nav, with its live project count.
 *
 * It reads the count from the same `useManageScreen` adapter the centre and rail use, which is
 * exactly why the left-secondary is a parallel-route slot (`@scope`) rather than something the
 * layout derives from the pathname: its content is per-route data, not just a label.
 */
export function ManageSubNav() {
  const screen = useManageScreen(<ManageScopeSlot />);

  return (
    <RailPanel label="MANAGE">
      <SubNav items={[{ key: 'projects', label: 'Projects', count: screen.projectCount, active: true }]} />
    </RailPanel>
  );
}
