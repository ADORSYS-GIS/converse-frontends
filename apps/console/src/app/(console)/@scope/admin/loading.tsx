'use client';

import { RailTextSkeleton } from '../../../../containers/rail-skeleton';

/**
 * `/admin` left-rail secondary loading skeleton (`@scope` slot) — `AdminSubNav`'s "Refill
 * requests" row carries a live pending count (`useAdminScreen()`), unavailable to this static
 * file, so it renders as a single text-line skeleton under the same ADMIN heading. Also covers
 * the route's own `async readSession()` gate latency, same as `admin/loading.tsx`.
 */
export default function AdminScopeLoading() {
  return <RailTextSkeleton label="ADMIN" lineCount={1} />;
}
