'use server';

import { revalidatePath } from 'next/cache';

import { currentClaims } from '../lib/server/session';
import { mutateRepoApproval } from '../lib/server/admin';

/** Shared body for the approve/deny actions — authorizes the caller on the specific permission
 *  (`repo:approve`/`repo:deny`) via `mutateRepoApproval`, throws on failure so the UI surfaces
 *  it instead of a silent no-op. */
async function mutate(formData: FormData, action: 'approve' | 'deny'): Promise<void> {
  const id = Number(formData.get('id'));
  const result = await mutateRepoApproval(await currentClaims(), id, action);
  if (!result.ok) {
    throw new Error(result.error);
  }
  // Approving/denying moves a repo between all three admin views at once.
  revalidatePath('/admin');
  revalidatePath('/admin/accepted');
  revalidatePath('/admin/denied');
}

export async function approveRepoAction(formData: FormData): Promise<void> {
  await mutate(formData, 'approve');
}

export async function denyRepoAction(formData: FormData): Promise<void> {
  await mutate(formData, 'deny');
}
