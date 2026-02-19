import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDeleteApiKey } from '@lightbridge/hooks';
import { DeleteApiKeyView } from '../views/delete-api-key-view';

export function DeleteApiKeyModal() {
  const params = useLocalSearchParams<{ id?: string | string[]; name?: string | string[] }>();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : null;
  const name = typeof params.name === 'string' ? params.name : '';
  const removeKey = useDeleteApiKey();

  const handleConfirm = async () => {
    if (!id) {
      router.back();
      return;
    }
    await removeKey.mutateAsync(id);
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
