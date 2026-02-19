import React, { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useApiKey, useCreateApiKey, useUpdateApiKey } from '@lightbridge/hooks';
import { ApiKeyFormView } from '../views/api-key-form-view';

export function ApiKeyEditorScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const apiKeyId = typeof params.id === 'string' ? params.id : null;
  const { data } = useApiKey(apiKeyId);
  const createKey = useCreateApiKey();
  const updateKey = useUpdateApiKey();
  const [name, setName] = useState('');

  useEffect(() => {
    if (apiKeyId && data?.name) {
      setName(data.name);
      return;
    }
    if (!apiKeyId) {
      setName('');
    }
  }, [apiKeyId, data?.name]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      return;
    }

    if (apiKeyId) {
      await updateKey.mutate({ id: apiKeyId, input: { name } });
    } else {
      await createKey.mutate({ name });
      setName('');
    }
  };

  return (
    <ApiKeyFormView
      name={name}
      onNameChange={setName}
      onSubmit={handleSubmit}
      loading={createKey.isPending || updateKey.isPending}
    />
  );
}
