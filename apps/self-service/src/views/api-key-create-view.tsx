import React, { useState } from 'react';
import { useTranslation } from '@lightbridge/i18n';
import {
  Button,
  Callout,
  Card,
  designTokens,
  Div,
  FormField,
  Icon as Feather,
  PageHeader,
  Scroll,
  Stack,
  Text,
  TextField,
} from '@lightbridge/ui';
import { ExpirySelector } from '../components/expiry-selector';
import { OneTimeSecretCard } from '../components/one-time-secret-card';
import { useThemeColors } from '../hooks/use-theme-colors';

/**
 * Plan every new key defaults to when the caller cannot pick one (no `project:member`
 * permission). This is cosmetic, not a working fallback: `createApiKey` is lead/owner-gated for
 * the entire mutation (see the procedure's doc comment in `packages/authz-rpc/schema/authz.cstack`),
 * so a caller who isn't this project's lead or its owning account cannot mint a key here AT ALL,
 * on `free` or any other plan — pinning the field to `free` just avoids offering a picker that
 * would always be rejected anyway. `createError` is what actually surfaces that rejection.
 */
const DEFAULT_API_KEY_BILLING_PLAN = 'free';

type ApiKeyCreateViewProps = {
  onBack: () => void;
  /** `expiresAt` is always resolved before Save can be pressed: an ISO datetime, or `null` for
   * "no expiry" -- never `undefined` (see `isSubmitDisabled` below). */
  onCreate: (name: string, billingPlan: string, expiresAt: string | null) => void;
  onCopy: (value: string) => void;
  isCreating?: boolean;
  /** When true, the user may pick a billing plan; otherwise keys are pinned to `free`. */
  canChoosePlan?: boolean;
  generatedSecret?: string | null;
  /** `ApiKeySecret.oauth2Url` from the create response, if the backend returned one. */
  generatedOauth2Url?: string | null;
  /**
   * Resolved copy for the last failed `createApiKey` attempt, if any — `null` once a new attempt
   * starts or after a success. See `resolveCreateApiKeyErrorMessage` in
   * `../screens/api-key-create-screen.tsx` for how this is derived from the thrown error.
   */
  createError?: string | null;
};

export function ApiKeyCreateView({
  onBack,
  onCreate,
  onCopy,
  isCreating = false,
  canChoosePlan = false,
  generatedSecret = null,
  generatedOauth2Url = null,
  createError = null,
}: Readonly<ApiKeyCreateViewProps>) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [name, setName] = useState('');
  const [billingPlan, setBillingPlan] = useState('');
  // `undefined` means "Custom" is selected with no valid date yet -- ExpirySelector's mount
  // effect replaces this with a real value (the 30-day preset by default) before the user does
  // anything, so this only stays `undefined` while actively editing an invalid custom date.
  const [expiresAt, setExpiresAt] = useState<string | null | undefined>(undefined);

  const trimmedName = name.trim();
  const resolvedPlan = canChoosePlan
    ? billingPlan.trim() || DEFAULT_API_KEY_BILLING_PLAN
    : DEFAULT_API_KEY_BILLING_PLAN;
  const isSubmitDisabled = isCreating || !trimmedName || expiresAt === undefined;

  const submit = () => {
    if (isSubmitDisabled || expiresAt === undefined) return;
    onCreate(trimmedName, resolvedPlan, expiresAt);
  };

  return (
    <Div tone="muted" width="full" style={{ flex: 1, backgroundColor: colors.muted }}>
      <PageHeader
        title={t('apiKeys.new')}
        leading={
          <Stack direction="row" align="center" gap="sm">
            <Button
              variant="ghost"
              size="iconSm"
              onPress={onBack}
              accessibilityLabel={t('apiKeys.back')}>
              <Feather name="arrow-left" size={designTokens.icon.nav} color={colors.ink} />
            </Button>
            <Text intent="caption">{t('nav.apiKeys')}</Text>
            <Feather name="chevron-right" size={14} color={colors.subtle} />
          </Stack>
        }
      />

      <Scroll tone="muted" pad="none" style={{ flex: 1 }}>
        <Div
          width="full"
          pad="lg"
          style={{
            paddingBottom: designTokens.layout.formFooterClearance,
          }}>
          <Stack gap="lg">
            {generatedSecret ? (
              <Stack gap="lg">
                <Callout
                  tone="success"
                  icon={
                    <Feather
                      name="check-circle"
                      size={designTokens.icon.prominent}
                      color={colors.success}
                    />
                  }>
                  <Stack gap="xs">
                    <Text intent="bodyStrong">{t('apiKeys.createdSuccessfully')}</Text>
                    <Text intent="caption">{t('apiKeys.securityNote')}</Text>
                  </Stack>
                </Callout>

                <OneTimeSecretCard
                  secret={generatedSecret}
                  onCopy={onCopy}
                  oauth2Url={generatedOauth2Url}
                />

                <Button variant="ghost" onPress={onBack} width="full">
                  {t('apiKeys.backToKeys')}
                </Button>
              </Stack>
            ) : (
              <Card size="md">
                <Stack gap="md">
                  <FormField label={t('apiKeys.keyLabel')}>
                    <TextField
                      placeholder={t('apiKeys.placeholder')}
                      value={name}
                      onChangeText={setName}
                      selectionColor={colors.primary}
                      autoFocus
                      editable={!isCreating}
                      autoCorrect={false}
                      returnKeyType={canChoosePlan ? 'next' : 'done'}
                      onSubmitEditing={canChoosePlan ? undefined : submit}
                    />
                  </FormField>
                  {canChoosePlan ? (
                    <FormField label={t('apiKeys.planLabel')}>
                      <TextField
                        placeholder={t('apiKeys.planPlaceholder')}
                        value={billingPlan}
                        onChangeText={setBillingPlan}
                        selectionColor={colors.primary}
                        editable={!isCreating}
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="done"
                        onSubmitEditing={submit}
                      />
                    </FormField>
                  ) : (
                    <Text intent="caption" style={{ color: colors.subtle }}>
                      {t('apiKeys.planLockedNote')}
                    </Text>
                  )}
                  <ExpirySelector
                    label={t('apiKeys.expiry.label')}
                    onChange={setExpiresAt}
                    disabled={isCreating}
                  />
                  {createError ? (
                    <Callout
                      tone="error"
                      icon={
                        <Feather
                          name="alert-circle"
                          size={designTokens.icon.action}
                          color={colors.error}
                        />
                      }>
                      {createError}
                    </Callout>
                  ) : null}
                  <Button
                    variant="primary"
                    onPress={submit}
                    disabled={isSubmitDisabled}
                    width="full">
                    {isCreating ? t('apiKeys.saving') : t('apiKeys.save')}
                  </Button>
                </Stack>
              </Card>
            )}
          </Stack>
        </Div>
      </Scroll>
    </Div>
  );
}
