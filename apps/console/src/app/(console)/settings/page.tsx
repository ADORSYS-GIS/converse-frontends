import { redirect } from 'next/navigation';

/**
 * `/settings` — no centre of its own any more (phase 6, admin/settings revamp — Attio pattern):
 * Account and Projects are real routes now (`/settings/account`, `/settings/projects`), so the
 * bare segment just sends a visitor to the first of the two. The sidebar's `Settings` item keeps
 * linking here rather than to `/settings/account` directly — `routeFromPathname` prefix-matches
 * both segments to the same nav row either way, so there is nothing the sidebar link would gain
 * from naming a specific tab.
 */
export default function SettingsRoute() {
  redirect('/settings/account');
}
