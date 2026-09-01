'use server';

import { revalidatePath } from 'next/cache';

import { currentClaims } from '../lib/server/session';
import { mutateRepoApproval } from '../lib/server/admin';

async function mutate(formData: FormData, action: 'approve' | 'deny'): Promise<void> {
  const id = Number(formData.get('id'));
  const result = await mutateRepoApproval(await currentClaims(), id, action);
  if (!result.ok) {
    throw new Error(result.error);
  }
  revalidatePath(`/repositories/${id}`);
  revalidatePath('/admin');
}

export async function approveRepoAction(formData: FormData): Promise<void> {
  await mutate(formData, 'approve');
}

export async function denyRepoAction(formData: FormData): Promise<void> {
  await mutate(formData, 'deny');
}
