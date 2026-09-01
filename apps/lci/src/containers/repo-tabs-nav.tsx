'use client';

import { SubNav } from '@lightbridge/ui-web/src/components/sub-nav';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** Overview/Graph/Settings tabs for one repository. A tab is active on an exact path match —
 *  prefix matching would light Overview up on every nested route, since it's the segment's own
 *  index. */
export function RepoTabsNav({ id }: { id: number }) {
  const pathname = usePathname();
  const base = `/repositories/${id}`;

  return (
    <SubNav
      items={[
        { key: 'overview', label: 'Overview', href: base, active: pathname === base },
        {
          key: 'graph',
          label: 'Graph',
          href: `${base}/graph`,
          active: pathname === `${base}/graph`,
        },
        {
          key: 'settings',
          label: 'Settings',
          href: `${base}/settings`,
          active: pathname === `${base}/settings`,
        },
      ]}
      linkComponent={Link}
      orientation="horizontal"
    />
  );
}
