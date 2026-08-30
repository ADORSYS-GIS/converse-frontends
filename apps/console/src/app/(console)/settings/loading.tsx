'use client';

import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

/**
 * `/settings/*`'s own Suspense fallback — every segment under this group is `force-dynamic`
 * (`settings/layout.tsx`), so without a loading boundary a navigation into any of the five live
 * settings routes shows an empty floor until that route's RSC payload lands. A single shared
 * skeleton across the whole area (rather than one per route) is deliberate: the settings area's
 * own left rail is already the standing chrome by the time this renders (the sidebar/top-bar
 * content branches on `areaFromPathname`, not on which settings route is loading), so the
 * transient content skeleton underneath it needs no more than a generic "loading" line — a
 * route-specific skeleton would be replaced by the real content within one paint either way.
 */
export default function SettingsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" subtitle="Loading…" />
    </div>
  );
}
