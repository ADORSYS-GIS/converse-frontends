import React, { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@lightbridge/i18n';
import { Button, Card, Div, Stack, Text } from '@lightbridge/ui';
import { useThemeColors } from '../hooks/use-theme-colors';

type OneTimeSecretCardProps = {
  secret: string;
  onCopy: (value: string) => void;
};

export function OneTimeSecretCard({ secret, onCopy }: Readonly<OneTimeSecretCardProps>) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimer.current) {
        clearTimeout(copyTimer.current);
      }
    };
  }, []);

  const handleCopy = () => {
    onCopy(secret);
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Card size="md">
      <Stack gap="md">
        <Text intent="caption">{t('apiKeys.yourNewKey')}</Text>
        <Div
          tone="muted"
          pad="md"
          rounded="xl"
          style={{ borderWidth: 1, borderColor: colors.border }}>
          <Text intent="bodyStrong" selectable>
            {secret}
          </Text>
        </Div>
        <Button variant="neutral" onPress={handleCopy} width="full">
          <Stack direction="row" align="center" gap="xs">
            <Ionicons name={copied ? 'checkmark' : 'copy'} size={18} color={colors.primary} />
            <Text intent="link">{copied ? t('apiKeys.copied') : t('apiKeys.copy')}</Text>
          </Stack>
        </Button>
      </Stack>
    </Card>
  );
}
