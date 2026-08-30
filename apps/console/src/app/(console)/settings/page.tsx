import { redirect } from 'next/navigation';

/**
 * `/settings` — the settings area's own bare-segment resolver (IA v3 phase 2). No centre of its
 * own: the nav's first entry is "Overview" (`settings-nav-groups`'s own order), so a bare visit
 * sends a visitor there, which in turn redirects to the actual landing lens
 * (`settings/overview/page.tsx` → `/settings/overview/usage`). Two hops rather than one straight
 * to `/settings/overview/usage`: `/settings/overview` is itself a real, nameable destination (the
 * settings nav's "Overview" row links to it, not straight to a specific lens), it just has no
 * content of its own yet — Phase 4 is what gives it real lens-switching content, per
 * `settings/overview/usage/page.tsx`'s own doc comment.
 */
export default function SettingsRoute() {
  redirect('/settings/overview');
}
