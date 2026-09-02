'use server';

import { revalidatePath } from 'next/cache';

import { currentClaims } from '../lib/server/session';
import {
  hasPermission,
  setRepoSettingsOverride,
  type RepoSettingsPatch,
} from '../lib/server/admin';

/**
 * Set (or clear, via `null`) one or more DB-layer setting overrides for a repository. Called
 * directly from a Client Component via `useTransition` rather than through a `<form action>` —
 * the controls it backs are fully controlled (`checked`/`onCheckedChange`, `value`/`onChange`),
 * with no native `name`/`FormData` participation to bind a form to.
 */
export async function setRepoSetting(
  id: number,
  patch: RepoSettingsPatch
): Promise<{ ok: true } | { ok: false; error: string }> {
  const claims = await currentClaims();
  if (!hasPermission(claims, 'repo:configure')) {
    return { ok: false, error: 'Unauthorized: repo:configure permission required' };
  }
  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, error: 'Invalid repository id' };
  }
  if (!(await setRepoSettingsOverride(id, patch))) {
    return { ok: false, error: 'Failed to save the setting — check the value is within range' };
  }
  revalidatePath(`/repositories/${id}/settings`);
  return { ok: true };
}

/** Clear a single DB-layer setting override back to the repo file/default. */
export async function clearRepoSetting(
  id: number,
  field: keyof RepoSettingsPatch
): Promise<{ ok: true } | { ok: false; error: string }> {
  return setRepoSetting(id, { [field]: null } as RepoSettingsPatch);
}
