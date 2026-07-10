import React from 'react';
import { useDeleteProject } from '@lightbridge/hooks';
import { DeleteProjectView } from '../views/delete-project-view';

type DeleteProjectSheetProps = {
  id: string;
  name: string;
  accountId: string;
  /** Dismiss the hosting sheet (Cancel or after a successful delete). */
  onClose: () => void;
  /** Called after a successful delete so the caller can clear its selection. */
  onDeleted?: () => void;
};

/**
 * Content for the delete-project bottom sheet. Owns the domain wiring (the
 * useDeleteProject mutation) and composes the presentational DeleteProjectView;
 * it is presented imperatively via `useSheet().present(...)`, so it takes its
 * params as props rather than reading the URL.
 */
export function DeleteProjectSheet({
  id,
  name,
  accountId,
  onClose,
  onDeleted,
}: Readonly<DeleteProjectSheetProps>) {
  const removeProject = useDeleteProject();

  const handleConfirm = async () => {
    await removeProject.mutateAsync({ id, accountId });
    onDeleted?.();
    onClose();
  };

  return (
    <DeleteProjectView
      name={name}
      loading={removeProject.isPending}
      onCancel={onClose}
      onConfirm={() => {
        void handleConfirm().catch((error) => {
          console.error('Failed to delete project:', error);
        });
      }}
    />
  );
}
