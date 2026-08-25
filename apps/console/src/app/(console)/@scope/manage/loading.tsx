'use client';

import { RailTextSkeleton } from '../../../../containers/rail-skeleton';

/**
 * `/manage` left-rail secondary loading skeleton (`@scope` slot) — `ManageSubNav`'s "Projects"
 * row carries a live project count (`useManageScreen()`), unavailable to this static file, so it
 * renders as a single text-line skeleton under the same MANAGE heading.
 */
export default function ManageScopeLoading() {
  return <RailTextSkeleton label="MANAGE" lineCount={1} />;
}
