import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { copyToClipboard } from '@lightbridge/api-native';
import {
  useCreateApiKey,
  useEnsureDefaultAccount,
  useEnsureDefaultProject,
  usePermissions,
} from '@lightbridge/hooks';
import { ApiKeyCreateView } from '../views/api-key-create-view';

export function ApiKeyCreateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ projectId?: string }>();
  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);
  const { mutate: ensureAccount, isPending: isAccountEnsuring } = useEnsureDefaultAccount();
  const { mutate: ensureProject, isPending: isProjectEnsuring } = useEnsureDefaultProject();
  const { mutate: createKey, isPending: isKeyCreating } = useCreateApiKey();
  const { has } = usePermissions();
  // Only account members may mint keys on a non-free plan; everyone else is pinned to `free`.
  const canChoosePlan = has('account:member');
  const projectId = typeof params.projectId === 'string' ? params.projectId : null;

  const handleBack = () => {
    // After key creation, the user intent is to go back to the API Keys list (not the previous route).
    // Use `replace` so the create screen is not kept in the back stack.
    if (generatedSecret) {
      const projectQuery = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
      router.replace(`/api-keys${projectQuery}`);
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.navigate('/api-keys');
  };

  const handleCreate = async (name: string, billingPlan: string) => {
    try {
      const resolvedProjectId = projectId ?? (await ensureProject((await ensureAccount()).id)).id;

      await createKey(
        { input: { name, billing_plan: billingPlan }, projectId: resolvedProjectId },
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

  const isPending = (!projectId && (isAccountEnsuring || isProjectEnsuring)) || isKeyCreating;

  return (
    <ApiKeyCreateView
      onBack={handleBack}
      onCopy={copyToClipboard}
      onCreate={handleCreate}
      isCreating={isPending}
      canChoosePlan={canChoosePlan}
      generatedSecret={generatedSecret}
    />
  );
}
