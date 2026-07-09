import React, { useState } from 'react';
import { copyToClipboard } from '@lightbridge/api-native';
import { useCurrentProject, useRotateApiKey } from '@lightbridge/hooks';
import { RotateApiKeyView } from '../views/rotate-api-key-view';

type RotateApiKeySheetProps = {
  id: string;
  name: string;
  projectId?: string;
  /** Dismiss the hosting sheet (Cancel, or Done after the secret is shown). */
  onClose: () => void;
};

/**
 * Content for the rotate-api-key bottom sheet. Owns the useRotateApiKey mutation
 * and the one-time-secret state, and composes the presentational
 * RotateApiKeyView; presented imperatively via `useSheet().present(...)`. The
 * sheet grows to reveal the generated secret, then dismisses on Done — the
 * underlying list refetches via query invalidation.
 */
export function RotateApiKeySheet({
  id,
  name,
  projectId,
  onClose,
}: Readonly<RotateApiKeySheetProps>) {
  const { data: currentProject } = useCurrentProject();
  const effectiveProjectId = projectId ?? currentProject?.id;
  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);
  const rotateKey = useRotateApiKey();

  const handleConfirm = async () => {
    if (!effectiveProjectId) {
      onClose();
      return;
    }

    try {
      const result = await rotateKey.mutateAsync({ id, projectId: effectiveProjectId });
      if (result?.secret) {
        setGeneratedSecret(result.secret);
      }
    } catch (error) {
      console.error('Failed to rotate API key:', error);
    }
  };

  return (
    <RotateApiKeyView
      keyName={name}
      onBack={onClose}
      onConfirm={handleConfirm}
      onCopy={copyToClipboard}
      isRotating={rotateKey.isPending}
      generatedSecret={generatedSecret}
    />
  );
}
