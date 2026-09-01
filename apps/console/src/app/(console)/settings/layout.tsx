import type { ReactNode } from 'react';

/**
 * `/settings/*` — IA v3 phase 2's "settings area" route group. `{children}` and nothing else:
 * this layout mounts no persistent chrome of its own — no shell primitive, no sidebar/top-bar
 * content, not even a wrapper `<div>`. That chrome is still mounted exactly once, by the ANCESTOR
 * `app/(console)/layout.tsx` (console-ui skill "Composition — the shell mounted once"); this
 * layout exists purely so the settings area has ONE place to hang a Suspense boundary
 * (`loading.tsx`, this directory) and a `dynamic` export across every route beneath it, the same
 * job `accounts/[accountId]/layout.tsx` does for its own segment — not to add a second shell.
 *
 * `force-dynamic` here (rather than on each settings route individually) is what lets
 * `settings/overview/usage/page.tsx`, `settings/policies/page.tsx`, `settings/tiers/page.tsx`,
 * `settings/info/page.tsx` and the `settings/accounts/*` subtree each read the session cookie or
 * live scope state without every one of them repeating the export — Next.js `dynamic` is
 * inherited by every segment nested under the layout that declares it. (`settings/refills-queue`
 * moved out entirely, to `/admin/refills-queue` — ADR 0013's same-day "the admin area" amendment
 * — so it no longer counts among this layout's own descendants.)
 *
 * `console-shell-mount.test.ts` regression-guards this file's own shape: it must import neither
 * the shell primitive nor the persistent nav primitive, the same guard `accounts/[accountId]/
 * layout.tsx` is held to, so switching INTO the settings area (a client-side navigation, same as
 * switching account) can never remount the ancestor chrome either.
 */
export const dynamic = 'force-dynamic';

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
