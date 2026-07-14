import React from 'react';
import { useTranslation } from '@lightbridge/i18n';

import { Button, Card, Page, Stack, Text, TextField } from '@lightbridge/ui';

export function CreateAccountView({
  onConfirm,
  onCancel,
  loading,
}: Readonly<{
  onConfirm: (input: { billingIdentity: string }) => void;
  onCancel: () => void;
  loading?: boolean;
}>) {
  const { t } = useTranslation();
  const [billingIdentity, setBillingIdentity] = React.useState('');

  const trimmedIdentity = billingIdentity.trim();
  const canCreate = trimmedIdentity.length > 0 && !loading;

  const handleConfirm = () => {
    if (!canCreate) return;
    onConfirm({ billingIdentity: trimmedIdentity });
  };

  return (
    <Page>
      <Card>
        <Stack gap="sm">
          <Text intent="value">{t('createAccount.title')}</Text>
          <Text intent="body">{t('createAccount.description')}</Text>
          <Text intent="caption">{t('createAccount.billingIdentityLabel')}</Text>
          <TextField
            value={billingIdentity}
            onChangeText={setBillingIdentity}
            placeholder={t('createAccount.billingIdentityPlaceholder')}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            onSubmitEditing={handleConfirm}
          />
          <Stack direction="row" gap="sm">
            <Button variant="ghost" onPress={onCancel}>
              {t('createAccount.cancel')}
            </Button>
            <Button onPress={handleConfirm} disabled={!canCreate}>
              {loading ? t('createAccount.creating') : t('createAccount.create')}
            </Button>
          </Stack>
        </Stack>
      </Card>
    </Page>
  );
}
