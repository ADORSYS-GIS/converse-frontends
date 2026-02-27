import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCurrentProject, useDeleteApiKey } from '@lightbridge/hooks';
import { DeleteApiKeyView } from '../views/delete-api-key-view';

export function DeleteApiKeyModal() {
  const params = useLocalSearchParams<{ id?: string | string[]; name?: string | string[] }>();
  const router = useRouter();
  const { data: currentProject } = useCurrentProject();
  const id = typeof params.id === 'string' ? params.id : null;
  const name = typeof params.name === 'string' ? params.name : '';
  const removeKey = useDeleteApiKey();

  const handleConfirm = async () => {
    if (!id || !currentProject?.id) {
      router.back();
      return;
    }
    await removeKey.mutateAsync({ id, projectId: currentProject.id });
    router.back();
  };

  return (
    <DeleteApiKeyView
      name={name}
      loading={removeKey.isPending}
      onCancel={() => router.back()}
      onConfirm={handleConfirm}
    />
  );
}
