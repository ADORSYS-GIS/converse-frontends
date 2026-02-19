import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button, Card, Stack, Text, TextField } from '@lightbridge/ui';
import { ScreenShell } from './screen-shell';

export function ApiKeyFormView({
  name,
  onNameChange,
  onSubmit,
  loading,
}: {
  name: string;
  onNameChange: (value: string) => void;
  onSubmit: () => void;
  loading?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <ScreenShell title={t('apiKeys.createTitle')}>
      <Card>
        <Stack gap="sm">
          <Text intent="body">{t('apiKeys.keyLabel')}</Text>
          <TextField value={name} onChangeText={onNameChange} placeholder={t('apiKeys.placeholder')} />
          <Button onPress={onSubmit} disabled={loading}>
            {loading ? t('apiKeys.saving') : t('apiKeys.save')}
          </Button>
        </Stack>
      </Card>
    </ScreenShell>
  );
}
