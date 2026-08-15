import React from 'react';
import { useTranslation } from '@lightbridge/i18n';

import { ConfirmDialog, Page, Text, TextField } from '@lightbridge/ui';

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
      <ConfirmDialog
        tone="danger"
        title={t('deleteProject.title')}
        message={t('deleteProject.description', { name })}
        confirmLabel={loading ? t('deleteProject.deleting') : t('deleteProject.confirm')}
        cancelLabel={t('deleteProject.cancel')}
        loading={loading}
        confirmDisabled={!canDelete}
        onConfirm={onConfirm}
        onCancel={onCancel}>
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
      </ConfirmDialog>
    </Page>
  );
}
