import { redirect } from 'next/navigation';

/**
 * `/admin` — the admin area's own bare-segment resolver, the same shape `settings/page.tsx`
 * already establishes for `/settings`: no centre of its own, just a redirect to the first (and,
 * as of this build, only) destination. `/admin/overview` owns the real server-side role gate
 * (`admin/overview/page.tsx`) — a non-admin hitting `/admin` still lands there and gets the honest
 * `notFound()`, never a visible-then-denied flash.
 */
export default function AdminRoute() {
  redirect('/admin/overview');
}
