import React from 'react';
import { hapticWarning } from '@lightbridge/api-native';
import { useCurrentProject, useDeleteApiKey } from '@lightbridge/hooks';
import { DeleteApiKeyView } from '../views/delete-api-key-view';

type DeleteApiKeySheetProps = {
  id: string;
  name: string;
  projectId?: string;
  /** Dismiss the hosting sheet (Cancel or after a successful delete). */
  onClose: () => void;
};

/**
 * Content for the delete-api-key bottom sheet. Owns the domain wiring (the
 * useDeleteApiKey mutation) and composes the presentational DeleteApiKeyView;
 * it is presented imperatively via `useSheet().present(...)`, so it takes its
 * params as props rather than reading the URL.
 */
export function DeleteApiKeySheet({
  id,
  name,
  projectId,
  onClose,
}: Readonly<DeleteApiKeySheetProps>) {
  const { data: currentProject } = useCurrentProject();
  const effectiveProjectId = projectId ?? currentProject?.id;
  const removeKey = useDeleteApiKey();

  const handleConfirm = async () => {
    if (!effectiveProjectId) {
      onClose();
      return;
    }
    await hapticWarning();
    await removeKey.mutateAsync({ id, projectId: effectiveProjectId });
    onClose();
  };

  return (
    <DeleteApiKeyView
      name={name}
      loading={removeKey.isPending}
      onCancel={onClose}
      onConfirm={handleConfirm}
    />
  );
}
