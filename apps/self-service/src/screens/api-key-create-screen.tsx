import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { copyToClipboard } from '@lightbridge/api-native';
import {
  useCreateApiKey,
  useEnsureDefaultAccount,
  useEnsureDefaultProject,
} from '@lightbridge/hooks';
import { ApiKeyCreateView } from '../views/api-key-create-view';

export function ApiKeyCreateScreen() {
  const router = useRouter();
  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);
  const { mutate: ensureAccount, isPending: isAccountEnsuring } = useEnsureDefaultAccount();
  const { mutate: ensureProject, isPending: isProjectEnsuring } = useEnsureDefaultProject();
  const { mutate: createKey, isPending: isKeyCreating } = useCreateApiKey();

  const handleBack = () => {
    // After key creation, the user intent is to go back to the API Keys list (not the previous route).
    // Use `replace` so the create screen is not kept in the back stack.
    if (generatedSecret) {
      router.replace('/api-keys');
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.navigate('/api-keys');
  };

  const handleCreate = async (name: string) => {
    try {
      const account = await ensureAccount();
      const project = await ensureProject(account.id);
      await createKey(
        { input: { name }, projectId: project.id },
        {
          onSuccess: (data) => {
            if (data?.secret) {
              setGeneratedSecret(data.secret);
            }
          },
        }
      );
    } catch (error) {
      console.error('Failed to create API key with bootstrap:', error);
    }
  };

  const isPending = isAccountEnsuring || isProjectEnsuring || isKeyCreating;

  return (
    <ApiKeyCreateView
      onBack={handleBack}
      onCopy={copyToClipboard}
      onCreate={handleCreate}
      isCreating={isPending}
      generatedSecret={generatedSecret}
    />
  );
}
