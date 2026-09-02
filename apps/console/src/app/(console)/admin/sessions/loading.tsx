'use client';

import { Card } from '@lightbridge/ui-web/src/components/card';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import { SessionLedger } from '@lightbridge/ui-web/src/sections/session-ledger';

/**
 * `/admin/sessions` centre loading skeleton. The route itself is `async` (`readSession()` before
 * the role gate), so this boundary covers that real server-side latency, not just the client chunk
 * fetch.
 *
 * Matches `AdminSessionsCentre`'s actual geometry — `SessionLedger` inside a `Card` — and drives
 * the section's OWN skeleton (console-ui skill §states: `raised` blocks matching the final row
 * geometry, never a spinner), the same contract the centre uses while its query is in flight.
 *
 * The filter cluster is deliberately NOT rendered here: it is a live control whose state comes
 * from the URL, and painting an inert copy of it for one frame is how a segmented control ends up
 * flickering between two different "active" cells on every navigation.
 */
export default function AdminSessionsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Sessions" subtitle="loading sessions…" />

      <Card>
        <SessionLedger sessions={[]} loading loadingRowCount={8} emptyMessage="" />
      </Card>
    </div>
  );
}
