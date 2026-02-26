import React from 'react';
import { useRouter } from 'expo-router';
import { useApiKeys } from '@lightbridge/hooks';
import { copyToClipboard } from '@lightbridge/api-native';
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
      onCopy={(value) => copyToClipboard(value)}
    />
  );
}
