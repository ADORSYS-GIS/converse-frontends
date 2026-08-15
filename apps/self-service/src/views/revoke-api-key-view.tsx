import React from 'react';
import { useTranslation } from '@lightbridge/i18n';

import { ConfirmDialog, designTokens, Div, Icon as Feather, Page } from '@lightbridge/ui';
import { useThemeColors } from '../hooks/use-theme-colors';

type RevokeApiKeyViewProps = {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
};

export function RevokeApiKeyView({
  name,
  onConfirm,
  onCancel,
  loading = false,
}: Readonly<RevokeApiKeyViewProps>) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  return (
    <Page>
      <ConfirmDialog
        title={t('apiKeys.revokeConfirmTitle')}
        message={t('apiKeys.revokeConfirmMessage', { name })}
        icon={
          <Div tone="errorSoft" rounded="xl" size="iconMd" align="center" justify="center">
            <Feather name="slash" size={designTokens.icon.action} color={colors.error} />
          </Div>
        }
        confirmLabel={loading ? t('apiKeys.revoking') : t('apiKeys.revoke')}
        cancelLabel={t('apiKeys.revokeCancel')}
        loading={loading}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    </Page>
  );
}
