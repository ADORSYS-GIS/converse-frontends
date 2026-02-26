import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { copyToClipboard } from '@lightbridge/api-native';
import { useCreateApiKey } from '@lightbridge/hooks';
import { McpBuilderView } from '../views/mcp-builder-view';

export function McpBuilderScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);
  const { mutate: createKey, isPending } = useCreateApiKey();

  const handleCreate = () => {
    createKey(
      { name: t('apiKeyBuilder.studioKeyName') },
      {
        onSuccess: (data) => {
          if (data?.secret) {
            setGeneratedSecret(data.secret);
          }
        },
      }
    );
  };

  return (
    <McpBuilderView
      onBack={() => {
        if (router.canGoBack()) {
          router.back();
          return;
        }

        router.navigate('/home');
      }}
      onCopy={copyToClipboard}
      onCreateKey={handleCreate}
      isCreating={isPending}
      generatedSecret={generatedSecret}
    />
  );
}
