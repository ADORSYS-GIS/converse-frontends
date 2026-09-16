'use client';

import { SubNav } from '@lightbridge/ui-web/src/components/sub-nav';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** Pending/Accepted/Denied tabs across the three admin approval views. Exact-path match, same
 *  as `RepoTabsNav` — prefix matching would light Pending up on every nested route. */
export function AdminTabsNav() {
  const pathname = usePathname();

  return (
    <SubNav
      items={[
        { key: 'pending', label: 'Pending', href: '/admin', active: pathname === '/admin' },
        {
          key: 'accepted',
          label: 'Accepted',
          href: '/admin/accepted',
          active: pathname === '/admin/accepted',
        },
        {
          key: 'denied',
          label: 'Denied',
          href: '/admin/denied',
          active: pathname === '/admin/denied',
        },
      ]}
      linkComponent={Link}
      orientation="horizontal"
    />
  );
}
