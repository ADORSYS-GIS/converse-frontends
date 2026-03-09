import React, { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { copyToClipboard } from '@lightbridge/api-native';
import {
  useCreateApiKey,
  useEnsureDefaultAccount,
  useEnsureDefaultProject,
} from '@lightbridge/hooks';
import { McpBuilderView } from '../views/mcp-builder-view';

export function McpBuilderScreen() {
  const router = useRouter();
  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);
  const { mutateAsync: ensureAccount, isPending: isAccountEnsuring } = useEnsureDefaultAccount();
  const { mutateAsync: ensureProject, isPending: isProjectEnsuring } = useEnsureDefaultProject();
  const createApiKey = useCreateApiKey();

  const handleCreateKey = useCallback(async () => {
    try {
      const account = await ensureAccount();
      const project = await ensureProject(account.id);

      const newKey = await createApiKey.mutate({
        projectId: project.id,
        input: {
          name: 'MCP Server',
        },
      });

      setGeneratedSecret(newKey.secret);
    } catch (error) {
      console.error('Failed to create API key:', error);
    }
  }, [createApiKey, ensureAccount, ensureProject]);

  const isCreating = createApiKey.isPending || isAccountEnsuring || isProjectEnsuring;

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
      isCreating={isCreating}
      generatedSecret={generatedSecret}
    />
  );
}
