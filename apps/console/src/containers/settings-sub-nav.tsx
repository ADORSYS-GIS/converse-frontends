'use client';

import { RailPanel } from '@lightbridge/ui-web/src/components/rail-panel';
import { SubNav } from '@lightbridge/ui-web/src/components/sub-nav';

import { useSettingsScreen } from './use-settings-screen';

/**
 * `/settings`'s left-rail secondary section — the SETTINGS sub-nav, with its live project count.
 *
 * It reads the count from the same `useSettingsScreen` adapter the centre uses, which is exactly
 * why the left-secondary is a parallel-route slot (`@scope`) rather than something the layout
 * derives from the pathname: its content is per-route data, not just a label. Both entries are
 * marked active because both sections are on screen at once — this screen is one scrolling page,
 * not two tabs, so the sub-nav is an index of what is below rather than a selector.
 */
export function SettingsSubNav() {
  const screen = useSettingsScreen();

  return (
    <RailPanel label="SETTINGS">
      <SubNav
        items={[
          { key: 'account', label: 'Account', active: true },
          {
            key: 'projects',
            label: 'Projects',
            count: screen.projectCount,
            active: true,
          },
        ]}
      />
    </RailPanel>
  );
}
