import React from 'react';
import { useTranslation } from '@lightbridge/i18n';
import { Button, Callout, designTokens, Icon as Feather, Stack } from '@lightbridge/ui';

import { useThemeColors } from '../hooks/use-theme-colors';
import { useDismissibleNotice } from '../hooks/use-dismissible-notice';

type AllowlistEnforcementNoticeProps = {
  /** Scopes the dismissal (and the copy's model list) to one project. */
  projectId: string;
  /** The project's current `allowedModels`. Empty ⇒ this project's behavior didn't change. */
  models: string[];
};

/**
 * One-time notice for a project lead whose project already had a non-empty
 * model allowlist configured before `lightbridge-authz` v3.0.0 started
 * actually enforcing it (ADORSYS-GIS/lightbridge-authz#282, #283 — the
 * allowlist was silently never enforced until that release). Projects with an
 * empty allowlist never render this: their behavior didn't change.
 *
 * Dismissal is per project and persists across visits (see
 * `useDismissibleNotice`), so a lead who has already acknowledged it won't
 * see it again.
 */
export function AllowlistEnforcementNotice({
  projectId,
  models,
}: Readonly<AllowlistEnforcementNoticeProps>) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { isDismissed, isReady, dismiss } = useDismissibleNotice(`allowlist-enforced.${projectId}`);

  if (models.length === 0 || !isReady || isDismissed) {
    return null;
  }

  return (
    <Stack direction="row" gap="sm" align="start" width="full">
      <Stack flex="grow">
        <Callout
          tone="info"
          icon={<Feather name="info" size={designTokens.icon.action} color={colors.primary} />}>
          {t('settings.project.allowlistEnforcedNotice', { models: models.join(', ') })}
        </Callout>
      </Stack>
      <Button
        variant="ghost"
        size="iconSm"
        onPress={dismiss}
        accessibilityLabel={t('settings.project.allowlistEnforcedDismiss')}>
        <Feather name="x" size={designTokens.icon.action} color={colors.subtle} />
      </Button>
    </Stack>
  );
}
