'use client';

import { RailPanel } from '@lightbridge/ui-web/src/components/rail-panel';
import { SubNav } from '@lightbridge/ui-web/src/components/sub-nav';
import { OverviewControls } from '@lightbridge/ui-web/src/sections/overview-controls';

import { useAdminSectionParam } from '../client/url-state';
import { useAdminOverviewScreen } from './use-admin-overview-screen';
import { useAdminScreen } from './use-admin-screen';

/**
 * `/admin`'s left-rail secondary section: the ADMIN sub-nav, plus — on the overview section — that
 * dashboard's own view controls.
 *
 * Two sections, one nav entry. The operator's dashboard and the budget refill queue are two views
 * of the same role-gated area, so they share `/admin` and its single admin nav item rather than
 * adding a second top-level entry to a group whose whole purpose is to be small. Which one is
 * showing is `?section=` (ADR 0011 Decision 1 names "active sub-nav tab" explicitly, and it is
 * `push`, so Back returns to the section you came from).
 *
 * Rows are BUTTONS, not links: `SubNav` renders a `<button>` whenever an item carries no `href`,
 * and switching section is a query-string write, not a route change — routing to a second URL
 * segment would remount the whole segment for a view swap the URL already expresses.
 *
 * The view controls sit here rather than in a right rail because nothing on the admin overview
 * retargets on a selection (console-ui skill: "before adding a rail to a screen, ask whether its
 * content retargets on selection"). `projectField`/`modelField` are deliberately omitted — this
 * screen is account-wide by definition, and a project picker would offer a narrowing it refuses to
 * apply; omitted, never rendered disabled.
 */
export function AdminSubNav() {
  const queue = useAdminScreen();
  const [section, setSection] = useAdminSectionParam();

  return (
    <>
      <RailPanel label="Admin">
        <SubNav
          items={[
            {
              key: 'overview',
              label: 'Overview',
              active: section === 'overview',
              onSelect: () => void setSection('overview'),
            },
            {
              key: 'refills',
              label: 'Refill requests',
              count: queue.pendingCount,
              active: section === 'refills',
              onSelect: () => void setSection('refills'),
            },
          ]}
        />
      </RailPanel>

      {section === 'overview' ? <AdminViewControls /> : null}
    </>
  );
}

/**
 * The overview's view knobs, in their own component so `useAdminOverviewScreen()` — and therefore
 * its usage/budget queries — is only mounted on the section that actually shows them. A hook call
 * cannot be conditional; a component's mount can.
 *
 * Reads the same adapter the centre does, exactly as `OverviewControlsRail` does for `/`: both
 * issue the same query keys, so TanStack serves them from one request, and the values they share
 * live in the query string rather than in a provider.
 */
function AdminViewControls() {
  const overview = useAdminOverviewScreen();

  return (
    <RailPanel label="View">
      <OverviewControls
        rangeField={overview.rangeField}
        bucketField={overview.bucketField}
        groupByField={overview.groupByField}
      />
    </RailPanel>
  );
}
