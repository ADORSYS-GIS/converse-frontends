import React, { useState } from 'react';
import { useTranslation } from '@lightbridge/i18n';
import type { BillingPlanInfo } from '@lightbridge/authz-rpc';
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
  SegmentedControl,
  Stack,
  Text,
  TextField,
} from '@lightbridge/ui';
import { ExpirySelector } from '../components/expiry-selector';
import { OneTimeSecretCard } from '../components/one-time-secret-card';
import { useThemeColors } from '../hooks/use-theme-colors';
import { validateExpiresAt } from '../lib/api-key-expiry';

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
  /** `expiresAt` is always a resolved, in-range ISO datetime before Save can be pressed -- every
   * key this app creates now carries a real expiration (standing requirement: "all api-keys
   * created from our system MUST have an expiry date"). Never `null`/`undefined` (see
   * `isSubmitDisabled` below, which blocks Save until a valid value exists). */
  onCreate: (name: string, billingPlan: string, expiresAt: string) => void;
  onCopy: (value: string) => void;
  isCreating?: boolean;
  /** When true, the user may pick a billing plan; otherwise keys are pinned to `free`. */
  canChoosePlan?: boolean;
  /**
   * The operator-configured billing-plan catalogue (`procedure.listBillingPlans`), fetched by
   * the screen (`useBillingPlans`, `@lightbridge/hooks`) rather than here -- this view stays a
   * plain presentational component driven entirely by props/callbacks, matching every other
   * `*CreateView`/`*SettingsView` in this app; only the screen layer touches react-query. Ignored
   * entirely while `canChoosePlan` is false.
   */
  plans?: BillingPlanInfo[];
  isPlansLoading?: boolean;
  isPlansError?: boolean;
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
  plans = [],
  isPlansLoading = false,
  isPlansError = false,
  generatedSecret = null,
  generatedOauth2Url = null,
  createError = null,
}: Readonly<ApiKeyCreateViewProps>) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [name, setName] = useState('');
  const [billingPlan, setBillingPlan] = useState('');
  // `undefined` means "Custom" is selected with no valid (or in-range) date yet -- ExpirySelector's
  // mount effect replaces this with a real value (the 30-day preset by default) before the user
  // does anything, so this only stays `undefined` while actively editing an invalid custom date.
  const [expiresAt, setExpiresAt] = useState<string | undefined>(undefined);

  // Seed a real selection once the catalogue loads, so Save doesn't sit blocked on "pick a
  // plan" for the common case -- the operator's first-listed plan, same convention
  // `ExpirySelector` uses for its own default preset. Only fires while nothing is selected yet:
  // a plan the user already picked is never overwritten out from under them by a refetch.
  // Computed during render rather than in an effect: the guard becomes false in the very render
  // the state update it triggers lands in, so this converges within one pass with no extra
  // commit -- see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes.
  if (canChoosePlan && !billingPlan && plans.length > 0) {
    setBillingPlan(plans[0]!.id);
  }

  const trimmedName = name.trim();
  const resolvedPlan = canChoosePlan ? billingPlan : DEFAULT_API_KEY_BILLING_PLAN;
  const isSubmitDisabled =
    isCreating ||
    !trimmedName ||
    expiresAt === undefined ||
    // A plan choice is offered but nothing is selected yet -- either the catalogue is still
    // loading, failed to load, or (correctly) came back empty. `resolvedPlan` would otherwise be
    // `''`, which the server rejects anyway, but blocking Save here surfaces the real state
    // (loading/error/empty, rendered below) instead of a generic server error after the fact.
    (canChoosePlan && !billingPlan);

  const submit = () => {
    if (isSubmitDisabled || expiresAt === undefined) return;
    // Defense-in-depth, not the primary gate: `ExpirySelector` already refuses to resolve an
    // out-of-range or past/present custom date to anything but `undefined` (see its `resolve`
    // doc comment), so this should be unreachable in practice. It stays here so a value that
    // ever arrives some other way -- a future refactor, a differently-sourced `expiresAt` -- is
    // still rejected client-side rather than sent straight to a backend that is the real gate
    // (see `validateExpiresAt`'s doc comment).
    if (!validateExpiresAt(expiresAt).ok) return;
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
                      {isPlansLoading ? (
                        <Text intent="caption" style={{ color: colors.subtle }}>
                          {t('apiKeys.planLoading')}
                        </Text>
                      ) : isPlansError ? (
                        <Text intent="caption" style={{ color: colors.error }}>
                          {t('apiKeys.planLoadError')}
                        </Text>
                      ) : plans.length === 0 ? (
                        <Text intent="caption" style={{ color: colors.subtle }}>
                          {t('apiKeys.planEmpty')}
                        </Text>
                      ) : (
                        <SegmentedControl
                          width="full"
                          value={billingPlan}
                          onChange={setBillingPlan}
                          options={plans.map((plan) => ({
                            key: plan.id,
                            label: plan.name,
                            disabled: isCreating,
                          }))}
                          accessibilityLabel={t('apiKeys.planLabel')}
                        />
                      )}
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
