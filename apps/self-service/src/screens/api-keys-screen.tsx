import React from 'react';
import { useRouter } from 'expo-router';
import { useApiKeys } from '@lightbridge/hooks';
import { copyToClipboard } from '@lightbridge/api-native';
import { ApiKeysListView } from '../views/api-keys-list-view';

export function ApiKeysScreen() {
  const { data = [] } = useApiKeys();
  const router = useRouter();

  return (
    <ApiKeysListView
      items={data}
      onBack={() => router.back()}
      onCreate={() => router.push('/api-key-editor')}
      onCopy={(value) => copyToClipboard(value)}
    />
  );
}
