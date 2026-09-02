'use client';

import { SubNav } from '@lightbridge/ui-web/src/components/sub-nav';
import type { SubNavItem } from '@lightbridge/ui-web/src/components/sub-nav';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { ADMIN_USAGE_CHATS_ROUTE, ADMIN_USAGE_ROUTE } from '../dashboards/usage-routes';

/**
 * The horizontal tab row under `/admin/usage`'s own header — Estate and Chats
 * (converse-frontends#449, story C6).
 *
 * **Why a sub-nav rather than a sixth admin rail row.** `/admin/usage/chats` is a LENS on the
 * usage area, not a sibling destination: it asks the same estate question with one filter applied,
 * and `adminRouteFromPathname` already resolves every `/admin/usage*` path to the one Usage rail
 * row by prefix. A second rail row would light up alongside Usage — two rows claiming to be where
 * you are — and would put a filter at the same level of the information architecture as the whole
 * area it filters. The horizontal `SubNav` is the pattern this console already uses for exactly
 * this shape (`account-detail-sub-nav.tsx`, the `/settings/accounts/<id>/*` tabs); this is that
 * component, one area over.
 *
 * The two DRILL-DOWN routes (`/admin/usage/actors/<id>`, `/admin/usage/channels/<azp>`) do NOT
 * render this row. They are not sections of the area — they are one row of it, opened — and they
 * carry a back link to `/admin/usage` in their own header instead. A tab row on a drill-down would
 * have no tab that could be `active`, which is worse than none.
 */
export function AdminUsageSubNav() {
  // `usePathname()` reads `null` outside a mounted app router (a container-level test with no
  // router context) rather than throwing — normalized so `active` degrades to "nothing is active"
  // instead of crashing, the same guard `AccountDetailSubNav` carries.
  const pathname = usePathname() ?? '';

  const items: SubNavItem[] = [
    {
      key: 'estate',
      label: 'Estate',
      href: ADMIN_USAGE_ROUTE,
      active: pathname === ADMIN_USAGE_ROUTE,
    },
    {
      key: 'chats',
      label: 'Chats',
      href: ADMIN_USAGE_CHATS_ROUTE,
      active: pathname.startsWith(ADMIN_USAGE_CHATS_ROUTE),
    },
  ];

  return <SubNav orientation="horizontal" items={items} linkComponent={Link} />;
}
