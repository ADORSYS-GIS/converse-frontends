import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { copyToClipboard } from '@lightbridge/api-native';
import { useCreateApiKey } from '@lightbridge/hooks';
import { ApiKeyCreateView } from '../views/api-key-create-view';

export function ApiKeyCreateScreen() {
    const router = useRouter();
    const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);
    const { mutate: createKey, isPending } = useCreateApiKey();

    const handleCreate = (name: string) => {
        createKey(
            { name },
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
        <ApiKeyCreateView
            onBack={() => {
                if (router.canGoBack()) {
                    router.back();
                    return;
                }
                router.navigate('/api-keys');
            }}
            onCopy={copyToClipboard}
            onCreate={handleCreate}
            isCreating={isPending}
            generatedSecret={generatedSecret}
        />
    );
}
