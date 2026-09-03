/**
 * The `apps/lci` server surface, for Storybook.
 *
 * `AdminCentre`, `RepositoryShell` and `RepoSettingsForm` bind `<form action={…}>` and `onChange`
 * handlers to Server Actions, and `SettingsCentre` imports `displayName` from
 * `lib/server/session.ts`. Importing those modules for real would drag `next/headers`,
 * `openid-client` and `jose` into a browser bundle — none of which belong there, and none of which
 * a story exercises. `packages/ui-web/.storybook/main.ts` aliases all four modules here.
 *
 * The action bodies are deliberately inert: a story shows that the control EXISTS and is
 * enabled/disabled correctly for the given permissions. What the action then does to the control
 * plane is covered by `apps/lci`'s own vitest suites, which mock the same boundary.
 */

interface ActionResult {
  ok: boolean;
  error: string;
}

function log(name: string, ...args: unknown[]): void {
  console.info(`[storybook] ${name}`, ...args);
}

/** `containers/admin-actions.ts` + `containers/repository-actions.ts`. */
export async function approveRepoAction(formData: FormData): Promise<void> {
  log('approveRepoAction', formData.get('id'));
}

export async function denyRepoAction(formData: FormData): Promise<void> {
  log('denyRepoAction', formData.get('id'));
}

/** `containers/repository-settings-actions.ts`. */
export async function setRepoSetting(id: number, patch: unknown): Promise<ActionResult> {
  log('setRepoSetting', id, patch);
  return { ok: true, error: '' };
}

export async function clearRepoSetting(id: number, field: string): Promise<ActionResult> {
  log('clearRepoSetting', id, field);
  return { ok: true, error: '' };
}

/**
 * `lib/server/session.ts`. Only `displayName` is reachable from a client component, and it is a
 * pure claim-precedence fallback with no I/O — kept identical to the real one on purpose, so a
 * story shows the same label the app would.
 */
export function displayName(claims: {
  name?: string;
  preferred_username?: string;
  email?: string;
  sub: string;
}): string {
  return claims.name ?? claims.preferred_username ?? claims.email ?? claims.sub;
}

/** `currentClaims` is server-only and never reached from a story; present so the alias is total. */
export async function currentClaims(): Promise<null> {
  return null;
}
