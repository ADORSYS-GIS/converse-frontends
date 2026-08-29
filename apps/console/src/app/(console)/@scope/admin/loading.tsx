'use client';

import { RailTextSkeleton } from '../../../../containers/rail-skeleton';

/**
 * `/admin` left-rail secondary loading skeleton (`@scope` slot) — `AdminSubNav`'s "Refill
 * requests" row carries a live pending count (`useAdminScreen()`), unavailable to this static
 * file, so its rows render as text-line skeletons under the same Admin heading. Also covers the
 * route's own `async readSession()` gate latency, same as `admin/loading.tsx`.
 *
 * Two lines, not one: the sub-nav is Overview + Refill requests since `/admin` gained its operator
 * dashboard. The label is sentence case for the same reason every other label in the console is
 * (console-ui skill "Never do": uppercase labels).
 */
export default function AdminScopeLoading() {
  return <RailTextSkeleton label="Admin" lineCount={2} />;
}
