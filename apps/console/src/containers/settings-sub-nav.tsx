'use client';

import { SubNav } from '@lightbridge/ui-web/src/components/sub-nav';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * `/settings`' own horizontal tab row (Attio pattern, phase 6) — Account and Projects are now
 * real routes (`/settings/account`, `/settings/projects`), not two sections stacked under one
 * header, so the switch between them is real `next/link` navigation rather than a URL param. Both
 * `AccountSettingsCentre` and `ProjectSettingsCentre` mount this directly under their own
 * `PageHeader`; active state comes from the pathname, matching `routeFromPathname`'s own
 * prefix-match contract for the sidebar's `Settings` item (both segments still resolve to it).
 */
export function SettingsSubNav({ projectCount }: { projectCount?: number }) {
  const pathname = usePathname();

  return (
    <SubNav
      orientation="horizontal"
      linkComponent={Link}
      items={[
        {
          key: 'account',
          label: 'Account',
          href: '/settings/account',
          active: pathname.startsWith('/settings/account'),
        },
        {
          key: 'projects',
          label: 'Projects',
          href: '/settings/projects',
          count: projectCount,
          active: pathname.startsWith('/settings/projects'),
        },
      ]}
    />
  );
}
