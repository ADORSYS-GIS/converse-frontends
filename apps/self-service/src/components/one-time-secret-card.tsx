import React, { useEffect, useState } from 'react';
import { useCopyToClipboard } from '@uidotdev/usehooks';
import { useTranslation } from '@lightbridge/i18n';
import { Button, Card, Div, Icon as Feather, Stack, Text } from '@lightbridge/ui';
import { useThemeColors } from '../hooks/use-theme-colors';

type OneTimeSecretCardProps = {
  secret: string;
  onCopy: (value: string) => void;
};

export function OneTimeSecretCard({ secret, onCopy }: Readonly<OneTimeSecretCardProps>) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [, copyToClipboard] = useCopyToClipboard();
  const [copied, setCopied] = useState(false);

  // Flip the button back from "Copied" to "Copy" after a moment, with automatic
  // cleanup — replaces the previous useRef + setTimeout bookkeeping.
  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleCopy = () => {
    // The web clipboard write now goes through useCopyToClipboard; onCopy is
    // retained so callers that wire the platform writer / observe copies keep
    // working (the existing test asserts it is called).
    void copyToClipboard(secret);
    onCopy(secret);
    setCopied(true);
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
            <Feather name={copied ? 'check' : 'copy'} size={18} color={colors.primary} />
            <Text intent="link">{copied ? t('apiKeys.copied') : t('apiKeys.copy')}</Text>
          </Stack>
        </Button>
      </Stack>
    </Card>
  );
}
