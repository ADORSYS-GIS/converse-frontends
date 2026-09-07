'use client';

import { Button } from '@lightbridge/ui-web/src/components/button';
import { TypedConfirmDialog } from '@lightbridge/ui-web/src/components/typed-confirm-dialog';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { denyRepoAction } from './repository-actions';

/**
 * The repository Danger zone's own deny control — a typed confirmation gate in front of the
 * action, so a misclick can't revoke review access outright. The reader has to type the
 * repository's own slug before the submit button enables.
 */
export function DenyRepoButton({ id, slug }: { id: number; slug: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function confirm() {
    if (pending) return;
    setPending(true);
    setError(undefined);
    const formData = new FormData();
    formData.set('id', String(id));
    try {
      await denyRepoAction(formData);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deny repository.');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Deny repository
      </Button>
      <TypedConfirmDialog
        open={open}
        title={`Deny ${slug}?`}
        description="Revokes review access. Can be re-approved later from Approvals."
        objectName={slug}
        confirmLabel="Deny"
        onConfirm={confirm}
        onCancel={() => setOpen(false)}
        error={error}
      />
    </>
  );
}
