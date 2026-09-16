'use server';

import { revalidatePath } from 'next/cache';

import { hasPermission } from '../lib/server/admin';
import { cancelTask } from '../lib/server/api';
import { currentClaims } from '../lib/server/session';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Authorizes on `task:cancel`, validates the id, then cancels the run — defense in depth on top
 *  of the control plane's own gate. Throws on failure so the UI surfaces it. */
export async function cancelRunAction(formData: FormData): Promise<void> {
  if (!hasPermission(await currentClaims(), 'task:cancel')) {
    throw new Error('Unauthorized: task:cancel permission required');
  }
  const id = String(formData.get('id') ?? '');
  if (!UUID_RE.test(id)) {
    throw new Error('Invalid task id');
  }
  const result = await cancelTask(id);
  if (!result.ok) {
    throw new Error('Failed to cancel the run');
  }
  revalidatePath(`/runs/${id}`);
}
