import React from 'react';
import { hapticWarning } from '@lightbridge/api-native';
import { useCurrentProject, useRevokeApiKey } from '@lightbridge/hooks';
import { RevokeApiKeyView } from '../views/revoke-api-key-view';

type RevokeApiKeySheetProps = {
  id: string;
  name: string;
  projectId?: string;
  /** Dismiss the hosting sheet (Cancel or after a successful revoke). */
  onClose: () => void;
};

/**
 * Content for the revoke-api-key bottom sheet. Owns the domain wiring (the
 * useRevokeApiKey mutation) and composes the presentational RevokeApiKeyView;
 * it is presented imperatively via `useSheet().present(...)`, so it takes its
 * params as props rather than reading the URL.
 */
export function RevokeApiKeySheet({
  id,
  name,
  projectId,
  onClose,
}: Readonly<RevokeApiKeySheetProps>) {
  const { data: currentProject } = useCurrentProject();
  const effectiveProjectId = projectId ?? currentProject?.id;
  const revokeKey = useRevokeApiKey();

  const handleConfirm = async () => {
    if (!effectiveProjectId) {
      onClose();
      return;
    }
    try {
      await hapticWarning();
      await revokeKey.mutateAsync({ id, projectId: effectiveProjectId });
      onClose();
    } catch (error) {
      console.error('Failed to revoke API key:', error);
    }
  };

  return (
    <RevokeApiKeyView
      name={name}
      loading={revokeKey.isPending}
      onCancel={onClose}
      onConfirm={handleConfirm}
    />
  );
}