import { redirect } from 'next/navigation';

/**
 * `/settings/overview` — the settings nav's "Overview" destination. Owner directive (IA v3 phase
 * 2): the cross-account usage overlay is the designated landing lens for this row, so a visit
 * here redirects straight to it. This segment stays a real, separately-nameable route rather than
 * folding directly into `settings/overview/usage/page.tsx` because Phase 4 is expected to add
 * sibling lenses under `settings/overview/*` (spend, latency, …) that this same "Overview" row
 * will need to pick between — this redirect is the seam that later phase hangs a lens switcher
 * off, without the nav or the URL structure changing again.
 */
export default function SettingsOverviewRoute() {
  redirect('/settings/overview/usage');
}
