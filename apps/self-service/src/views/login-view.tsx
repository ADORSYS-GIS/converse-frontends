import React from 'react';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { Button, Div, Heading, Lottie, Page, Stack, Text } from '@lightbridge/ui';

const fingerprintSource = require('@lightbridge/ui/src/assets/lotties/auth/fingerprint-success.json');

export function LoginView({
  onSsoPress,
  onHelpPress,
  loading,
}: {
  onSsoPress: () => void;
  onHelpPress: () => void;
  loading?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <Page tone="muted" pad="md">
      <Div width="full" align="end">
        <Button
          variant="icon"
          size="iconSm"
          onPress={onHelpPress}
          accessibilityLabel={t('login.help')}
        >
          <Ionicons name="help" size={18} color="#ffffff" />
        </Button>
      </Div>

      <Stack align="center" justify="center" flex="grow" width="full">
        <Div width="full" maxWidth="md">
          <Stack flex="grow" justify="between" width="full">
            <Stack align="center" width="full">
              <Heading tone="subtitle" align="center">
                {t('login.title')}
              </Heading>
            </Stack>

            <Stack align="center" gap="lg" width="full">
              <Div tone="brandSoft" rounded="xl" size="iconXl" align="center" justify="center">
                <Lottie source={fingerprintSource} size="md" loop={false} />
              </Div>

              <Stack align="center" gap="sm" width="full">
                <Heading tone="title" align="center">
                  {t('login.welcome')}
                </Heading>
                <Heading tone="subtitle" align="center">
                  {t('login.description')}
                </Heading>
              </Stack>

              <Button
                variant="primary"
                size="lg"
                width="full"
                disabled={loading}
                onPress={onSsoPress}
              >
                <Ionicons name="lock-closed" size={18} color="#ffffff" />
                {' '}
                {loading ? t('login.ssoLoading') : t('login.sso')}
              </Button>

              <Text intent="caption" align="center">
                {t('login.footnote')}
              </Text>
            </Stack>

            <Stack align="center" width="full">
              <Text
                intent="link"
                align="center"
                onPress={onHelpPress}
                accessibilityRole="link"
              >
                {t('login.trouble')}
              </Text>
            </Stack>
          </Stack>
        </Div>
      </Stack>
    </Page>
  );
}
