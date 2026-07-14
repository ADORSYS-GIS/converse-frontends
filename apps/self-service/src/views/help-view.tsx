import React from 'react';
import { useTranslation } from '@lightbridge/i18n';

import {
  Callout,
  Card,
  designTokens,
  Div,
  Icon as Feather,
  Scroll,
  Stack,
  Text,
} from '@lightbridge/ui';
import { useThemeColors } from '../hooks/use-theme-colors';

type HelpViewProps = {
  onOpenDocs: () => void;
  onOpenKeysGuide: () => void;
  onContactSupport: () => void;
};

export function HelpView({
  onOpenDocs,
  onOpenKeysGuide,
  onContactSupport,
}: Readonly<HelpViewProps>) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  return (
    <Scroll tone="muted" pad="md">
      <Stack gap="lg">
        <Stack gap="xs">
          <Text intent="eyebrow">{t('help.title')}</Text>
          <Text intent="body">{t('help.resourcesDescription')}</Text>
        </Stack>

        <Card size="md">
          <Stack gap="md">
            <Text intent="eyebrow">{t('help.resourcesTitle')}</Text>

            <Div
              tone="default"
              rounded="md"
              pad="md"
              accessibilityRole="button"
              accessibilityLabel={t('help.docs')}
              onPress={onOpenDocs}>
              <Stack direction="row" align="center" gap="sm">
                <Div tone="brandSoft" rounded="xl" size="iconMd" align="center" justify="center">
                  <Feather name="book" size={designTokens.icon.action} color={colors.primary} />
                </Div>
                <Stack gap="xs" style={{ flex: 1 }}>
                  <Text intent="bodyStrong">{t('help.docs')}</Text>
                  <Text intent="caption">{t('help.docsDescription')}</Text>
                </Stack>
                <Feather name="chevron-right" size={18} color={colors.subtle} />
              </Stack>
            </Div>

            <Div
              tone="default"
              rounded="md"
              pad="md"
              accessibilityRole="button"
              accessibilityLabel={t('help.keysGuide')}
              onPress={onOpenKeysGuide}>
              <Stack direction="row" align="center" gap="sm">
                <Div tone="brandSoft" rounded="xl" size="iconMd" align="center" justify="center">
                  <Feather name="key" size={designTokens.icon.action} color={colors.primary} />
                </Div>
                <Stack gap="xs" style={{ flex: 1 }}>
                  <Text intent="bodyStrong">{t('help.keysGuide')}</Text>
                  <Text intent="caption">{t('help.keysGuideDescription')}</Text>
                </Stack>
                <Feather name="chevron-right" size={18} color={colors.subtle} />
              </Stack>
            </Div>

            <Div
              tone="default"
              rounded="md"
              pad="md"
              accessibilityRole="button"
              accessibilityLabel={t('help.contactSupport')}
              onPress={onContactSupport}>
              <Stack direction="row" align="center" gap="sm">
                <Div tone="successSoft" rounded="xl" size="iconMd" align="center" justify="center">
                  <Feather name="mail" size={designTokens.icon.action} color={colors.success} />
                </Div>
                <Stack gap="xs" style={{ flex: 1 }}>
                  <Text intent="bodyStrong">{t('help.contactSupport')}</Text>
                  <Text intent="caption">{t('help.contactSupportDescription')}</Text>
                </Stack>
                <Feather name="chevron-right" size={18} color={colors.subtle} />
              </Stack>
            </Div>
          </Stack>
        </Card>

        <Card size="md">
          <Stack gap="md">
            <Text intent="eyebrow">{t('help.faqTitle')}</Text>

            <Stack gap="md">
              <Callout tone="neutral">
                <Stack gap="xs">
                  <Text intent="bodyStrong">{t('help.faqRotate')}</Text>
                  <Text intent="caption">{t('help.faqRotateAnswer')}</Text>
                </Stack>
              </Callout>

              <Callout tone="neutral">
                <Stack gap="xs">
                  <Text intent="bodyStrong">{t('help.faqRevoke')}</Text>
                  <Text intent="caption">{t('help.faqRevokeAnswer')}</Text>
                </Stack>
              </Callout>

              <Callout tone="neutral">
                <Stack gap="xs">
                  <Text intent="bodyStrong">{t('help.faqProject')}</Text>
                  <Text intent="caption">{t('help.faqProjectAnswer')}</Text>
                </Stack>
              </Callout>
            </Stack>
          </Stack>
        </Card>
      </Stack>
    </Scroll>
  );
}
