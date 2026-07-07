import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { copyToClipboard } from '@lightbridge/api-native';
import { useCurrentProject, useRotateApiKey } from '@lightbridge/hooks';
import { RotateApiKeyView } from '../views/rotate-api-key-view';

export function RotateApiKeyModal() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    name?: string | string[];
    projectId?: string | string[];
  }>();
  const router = useRouter();
  const { data: currentProject } = useCurrentProject();
  const id = typeof params.id === 'string' ? params.id : null;
  const name = typeof params.name === 'string' ? params.name : '';
  const projectId = typeof params.projectId === 'string' ? params.projectId : currentProject?.id;
  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);
  const rotateKey = useRotateApiKey();

  const handleConfirm = async () => {
    if (!id || !projectId) {
      router.back();
      return;
    }

    try {
      const result = await rotateKey.mutateAsync({ id, projectId });
      if (result?.secret) {
        setGeneratedSecret(result.secret);
      }
    } catch (error) {
      console.error('Failed to rotate API key:', error);
    }
  };

  const handleBack = () => {
    if (generatedSecret) {
      router.replace(
        projectId ? `/api-keys?projectId=${encodeURIComponent(projectId)}` : '/api-keys'
      );
      return;
    }

    router.back();
  };

  return (
    <RotateApiKeyView
      keyName={name}
      onBack={handleBack}
      onConfirm={handleConfirm}
      onCopy={copyToClipboard}
      isRotating={rotateKey.isPending}
      generatedSecret={generatedSecret}
    />
  );
}
