import React from 'react';
import { useRouter } from 'expo-router';
import { copyToClipboard } from '@lightbridge/api-native';
import { McpBuilderView } from '../views/mcp-builder-view';

export function McpBuilderScreen() {
  const router = useRouter();

  const handleCreate = async () => {
    // Redirect to API key page to set up account/project first
    // The user should first go to API key page to create their account/project
    router.navigate('/api-keys/new');
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
      isCreating={false}
      generatedSecret={null}
    />
  );
}
