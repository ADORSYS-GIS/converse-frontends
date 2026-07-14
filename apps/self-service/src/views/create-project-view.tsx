import React from 'react';
import { useTranslation } from '@lightbridge/i18n';

import { Button, Card, Page, Stack, Text, TextField } from '@lightbridge/ui';

export function CreateProjectView({
  onConfirm,
  onCancel,
  loading,
}: Readonly<{
  onConfirm: (input: { name: string; billingPlan: string }) => void;
  onCancel: () => void;
  loading?: boolean;
}>) {
  const { t } = useTranslation();
  const [name, setName] = React.useState('');
  const [billingPlan, setBillingPlan] = React.useState('');

  const trimmedName = name.trim();
  const trimmedPlan = billingPlan.trim();
  const canCreate = trimmedName.length > 0 && !loading;

  const handleConfirm = () => {
    if (!canCreate) return;
    onConfirm({
      name: trimmedName,
      billingPlan: trimmedPlan || t('createProject.planPlaceholder'),
    });
  };

  return (
    <Page>
      <Card>
        <Stack gap="sm">
          <Text intent="value">{t('createProject.title')}</Text>
          <Text intent="body">{t('createProject.description')}</Text>
          <Text intent="caption">{t('createProject.nameLabel')}</Text>
          <TextField
            value={name}
            onChangeText={setName}
            placeholder={t('createProject.namePlaceholder')}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            onSubmitEditing={handleConfirm}
          />
          <Text intent="caption">{t('createProject.planLabel')}</Text>
          <TextField
            value={billingPlan}
            onChangeText={setBillingPlan}
            placeholder={t('createProject.planPlaceholder')}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            onSubmitEditing={handleConfirm}
          />
          <Stack direction="row" gap="sm">
            <Button variant="ghost" onPress={onCancel}>
              {t('createProject.cancel')}
            </Button>
            <Button onPress={handleConfirm} disabled={!canCreate}>
              {loading ? t('createProject.creating') : t('createProject.create')}
            </Button>
          </Stack>
        </Stack>
      </Card>
    </Page>
  );
}
