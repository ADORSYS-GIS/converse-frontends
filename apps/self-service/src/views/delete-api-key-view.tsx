import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button, Card, Page, Stack, Text } from '@lightbridge/ui';

export function DeleteApiKeyView({
  name,
  onConfirm,
  onCancel,
  loading,
}: {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <Page>
      <Card>
        <Stack gap="sm">
          <Text intent="value">{t('deleteKey.title')}</Text>
          <Text intent="body">
            {t('deleteKey.description', { name })}
          </Text>
          <Stack direction="row" gap="sm">
            <Button variant="ghost" onPress={onCancel}>
              {t('deleteKey.cancel')}
            </Button>
            <Button onPress={onConfirm} disabled={loading}>
              {loading ? t('deleteKey.deleting') : t('deleteKey.confirm')}
            </Button>
          </Stack>
        </Stack>
      </Card>
    </Page>
  );
}
