import React, { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { copyToClipboard } from '@lightbridge/api-native';
import { useApiKeys, useCurrentProject, useCreateApiKey } from '@lightbridge/hooks';
import { McpBuilderView } from '../views/mcp-builder-view';

export function McpBuilderScreen() {
  const router = useRouter();
  const { data: apiKeys = [] } = useApiKeys();
  const { data: project } = useCurrentProject();
  const createApiKey = useCreateApiKey();
  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);

  // Get the most recent API key if available

  const handleCreateKey = useCallback(async () => {
    if (!project?.id) {
      return;
    }

    try {
      // Create a new API key and get the secret
      const newKey = await createApiKey.mutate({
        projectId: project.id,
        input: {
          name: 'MCP Key',
        },
      });

      // The secret is returned in the response
      setGeneratedSecret(newKey.secret);
    } catch (error) {
      console.error('Failed to create API key:', error);
    }
  }, [project, createApiKey]);

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
      onCreateKey={handleCreateKey}
      isCreating={createApiKey.isPending}
      generatedSecret={generatedSecret}
    />
  );
}
