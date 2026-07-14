import React from 'react';
import { useTranslation } from '@lightbridge/i18n';

import { Button, Card, Page, Stack, Text, TextField } from '@lightbridge/ui';

export function DeleteProjectView({
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
  const confirmationTarget = name || t('deleteProject.fallbackName');
  const canDelete = confirmation.trim() === confirmationTarget;

  return (
    <Page>
      <Card>
        <Stack gap="sm">
          <Text intent="value">{t('deleteProject.title')}</Text>
          <Text intent="body">{t('deleteProject.description', { name })}</Text>
          <Text intent="caption" selectable>
            {t('deleteProject.confirmInstruction', { target: confirmationTarget })}
          </Text>
          <TextField
            value={confirmation}
            onChangeText={setConfirmation}
            placeholder={confirmationTarget}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            returnKeyType="done"
            onSubmitEditing={() => {
              if (!loading && canDelete) onConfirm();
            }}
          />
          <Stack direction="row" gap="sm">
            <Button variant="ghost" onPress={onCancel}>
              {t('deleteProject.cancel')}
            </Button>
            <Button onPress={onConfirm} disabled={loading || !canDelete}>
              {loading ? t('deleteProject.deleting') : t('deleteProject.confirm')}
            </Button>
          </Stack>
        </Stack>
      </Card>
    </Page>
  );
}
