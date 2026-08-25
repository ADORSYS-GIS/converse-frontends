import { OverviewRail } from '../../../containers/overview-rail';

export const dynamic = 'force-dynamic';

/** `/` — the Overview right rail, mounted into `(console)/layout.tsx`'s `rail` slot. */
export default function OverviewRailRoute() {
  return <OverviewRail />;
}
