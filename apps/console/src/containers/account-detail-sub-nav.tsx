'use client';

import { SubNav } from '@lightbridge/ui-web/src/components/sub-nav';
import type { SubNavItem } from '@lightbridge/ui-web/src/components/sub-nav';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * The horizontal tab row shared by all three screens under `/settings/accounts/<id>/*`
 * (IA v3 phase E, task item 6 — "Inside an account detail, sub-navigation ... for
 * Overview/Projects/Request refill"): the account-detail root itself (`account-detail-centre.tsx`,
 * "Overview"), the moved projects ledger (`projects-centre.tsx`, "Projects"), and the moved refill
 * request flow (`refill-centre.tsx`, "Request refill"). One component, mounted three times (once
 * per route, each computing its own `active` state off `usePathname()`) rather than three
 * hand-copied tab arrays — this is the SAME horizontal `SubNav` orientation
 * `settings.stories.tsx` demonstrated for the old `/settings/account`·`/settings/projects` pair
 * (phase 6), reused for a THIRD tab this phase adds.
 *
 * `orientation="horizontal"` renders plain text tabs under a `PageHeader`, never the vertical
 * rail-row treatment `NavSpine`/`ConsoleSidebar` use — see `SubNavProps`' own doc comment.
 */
export function AccountDetailSubNav({ accountId }: { accountId: string }) {
  // `usePathname()` reads `null` outside a mounted Next.js app router (e.g. a container-level
  // test rendered with no router context) rather than throwing — normalized to `''` so `active`
  // below degrades to "nothing is active" instead of crashing on `null.startsWith`.
  const pathname = usePathname() ?? '';
  const base = `/settings/accounts/${accountId}`;

  const items: SubNavItem[] = [
    { key: 'overview', label: 'Overview', href: base, active: pathname === base },
    {
      key: 'projects',
      label: 'Projects',
      href: `${base}/projects`,
      active: pathname.startsWith(`${base}/projects`),
    },
    {
      key: 'request-refill',
      label: 'Request refill',
      href: `${base}/request-refill`,
      active: pathname.startsWith(`${base}/request-refill`),
    },
  ];

  return <SubNav orientation="horizontal" items={items} linkComponent={Link} />;
}
