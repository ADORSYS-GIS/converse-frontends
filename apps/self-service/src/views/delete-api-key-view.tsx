import React from 'react';
import { useTranslation } from '@lightbridge/i18n';

import { ConfirmDialog, Page, Text, TextField } from '@lightbridge/ui';

export function DeleteApiKeyView({
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
  const confirmationTarget = name || t('deleteKey.fallbackName');
  const canDelete = confirmation.trim() === confirmationTarget;

  return (
    <Page>
      <ConfirmDialog
        tone="danger"
        title={t('deleteKey.title')}
        message={t('deleteKey.description', { name })}
        confirmLabel={loading ? t('deleteKey.deleting') : t('deleteKey.confirm')}
        cancelLabel={t('deleteKey.cancel')}
        loading={loading}
        confirmDisabled={!canDelete}
        onConfirm={onConfirm}
        onCancel={onCancel}>
        <Text intent="caption" selectable>
          {t('deleteKey.confirmInstruction', { target: confirmationTarget })}
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
      </ConfirmDialog>
    </Page>
  );
}
