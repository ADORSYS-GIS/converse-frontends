import React from 'react';
import { useTranslation } from '@lightbridge/i18n';

import { Button, Card, Page, Stack, Text, TextField } from '@lightbridge/ui';

export function DeleteAccountView({
  name,
  onConfirm,
  onCancel,
  loading,
}: Readonly<{
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}>) {
  const { t } = useTranslation();
  const [confirmation, setConfirmation] = React.useState('');
  const confirmationTarget = name || t('deleteAccount.fallbackName');
  const canDelete = confirmation.trim() === confirmationTarget;

  return (
    <Page>
      <Card>
        <Stack gap="sm">
          <Text intent="value">{t('deleteAccount.title')}</Text>
          <Text intent="body">{t('deleteAccount.description', { name })}</Text>
          <Text intent="caption">
            {t('deleteAccount.confirmInstruction', { target: confirmationTarget })}
          </Text>
          <TextField
            value={confirmation}
            onChangeText={setConfirmation}
            placeholder={confirmationTarget}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
          <Stack direction="row" gap="sm">
            <Button variant="ghost" onPress={onCancel}>
              {t('deleteAccount.cancel')}
            </Button>
            <Button onPress={onConfirm} disabled={loading || !canDelete}>
              {loading ? t('deleteAccount.deleting') : t('deleteAccount.confirm')}
            </Button>
          </Stack>
        </Stack>
      </Card>
    </Page>
  );
}
