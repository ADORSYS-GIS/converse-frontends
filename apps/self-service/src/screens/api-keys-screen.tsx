import React from 'react';
import { useRouter } from 'expo-router';
import { useApiKeys } from '@lightbridge/hooks';
import { ApiKeysListView } from '../views/api-keys-list-view';

export function ApiKeysScreen() {
  const { data = [], isLoading } = useApiKeys();
  const router = useRouter();

  return (
    <ApiKeysListView
      items={data}
      isLoading={isLoading}
      onBack={() => router.back()}
      onCreate={() => router.navigate('/api-keys/new')}
      onDelete={(id, name) => router.push(`/delete-api-key?id=${id}&name=${name}`)}
    />
  );
}
