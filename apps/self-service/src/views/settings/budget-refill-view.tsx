import React from 'react';
import { useTranslation } from '@lightbridge/i18n';
import {
  Button,
  Callout,
  Card,
  designTokens,
  Div,
  FormField,
  Heading,
  Icon as Feather,
  PageHeader,
  Scroll,
  SectionCard,
  SegmentedControl,
  Stack,
  Text,
} from '@lightbridge/ui';
// Type-only -- erased at compile time, so this does NOT pull `@lightbridge/authz-rpc` (and
// transitively `@cratestack/cbor`) into this file's runtime import graph. `AugmentationRequest`
// already proved that out for this exact file; `MyBudgetRefillLadder` follows the same rule.
import type { AugmentationRequest, MyBudgetRefillLadder } from '@lightbridge/hooks';
// Pure helpers only, from the dependency-free `./budget-tiers` subpath -- NOT the `@lightbridge/hooks`
// barrel, which pulls in `@lightbridge/authz-rpc` (and transitively `@cratestack/cbor`, which
// Jest's resolver can't follow) at runtime. See packages/hooks/src/budget-tiers.ts's module-level
// comment.
import {
  formatBudgetTierAmount,
  formatMicroUsd,
  isBudgetTier,
} from '@lightbridge/hooks/budget-tiers';
import { useThemeColors } from '../../hooks/use-theme-colors';

/**
 * Best-effort copy for `AugmentationRequest.policyReasonCodes` when a request is `denied` with no
 * `rejectionReason` set (an admin-authored rejection always has one -- see `rejectAugmentationRequest`
 * -- so this table only ever applies to an AUTOMATIC policy denial). The canonical reason-code
 * enum lives in `lightbridge-authz-budget`'s Rust source, which this frontend repo does not have
 * a checkout of -- these entries are illustrative starting points, not a verified exhaustive
 * list. Any code not listed here falls through to `settings.budget.deniedGenericReason`, so an
 * unrecognized code never renders as a raw machine string.
 */
const DENIED_REASON_CODE_I18N_KEYS: Record<string, string> = {
  self_service_disabled: 'settings.budget.deniedReasonCodes.self_service_disabled',
  account_suspended: 'settings.budget.deniedReasonCodes.account_suspended',
  policy_denied: 'settings.budget.deniedReasonCodes.policy_denied',
};

/**
 * Renders `AugmentationRequest.requestedTier` (the tier the SERVER assigned -- see the module
 * comment on `packages/hooks/src/budget-tiers.ts`) as a dollar label. Falls back to computing the
 * amount directly from `requestedAmountMicros` if the tier string isn't one of the ladder values
 * this UI's lookup table knows about, so an unrecognized/future tier still renders a real number
 * instead of a raw machine string.
 */
function requestedTierLabel(result: AugmentationRequest): string {
  return isBudgetTier(result.requestedTier)
    ? formatBudgetTierAmount(result.requestedTier)
    : formatMicroUsd(result.requestedAmountMicros);
}

/**
 * The ADR-0015 amount picker: choosable amounts sourced ONLY from `ladder.allowedAmountsMicros`
 * (the active policy's live, admin-configured offered set) -- never a hardcoded list. Real
 * loading/error/empty states, matching the billing-plan selector's own pattern in
 * `api-key-create-view.tsx` (a caption line, not a placard). `SegmentedControl` is the same
 * control already used for the API-key expiry presets and the billing-plan selector.
 */
function AmountPicker({
  ladder,
  isLoading,
  isError,
  value,
  onChange,
  disabled,
  colors,
  t,
}: {
  ladder: MyBudgetRefillLadder | null;
  isLoading: boolean;
  isError: boolean;
  value?: string;
  onChange?: (amountMicros: string) => void;
  disabled: boolean;
  colors: ReturnType<typeof useThemeColors>;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  if (isLoading) {
    return (
      <Text intent="caption" style={{ color: colors.subtle }}>
        {t('settings.budget.amountLoading')}
      </Text>
    );
  }

  if (isError) {
    return (
      <Text intent="caption" style={{ color: colors.error }}>
        {t('settings.budget.amountLoadError')}
      </Text>
    );
  }

  const amounts = ladder?.allowedAmountsMicros ?? [];

  if (amounts.length === 0) {
    return (
      <Text intent="caption" style={{ color: colors.subtle }}>
        {t('settings.budget.amountEmpty')}
      </Text>
    );
  }

  return (
    <SegmentedControl
      width="full"
      value={value ?? ''}
      onChange={onChange ?? (() => undefined)}
      options={amounts.map((amountMicros) => ({
        key: amountMicros,
        label: formatMicroUsd(amountMicros),
        disabled,
      }))}
      accessibilityLabel={t('settings.budget.amountLabel')}
    />
  );
}

export type BudgetRefillViewProps = {
  showBackButton?: boolean;
  onBack: () => void;
  /** `usePermissions().has('budget:self-refill')` -- defensive re-check, not just the hidden nav entry. */
  canRefill?: boolean;
  /** The calendar month (`'YYYY-MM'`) this request is for -- client-computed, current month. */
  period: string;
  isSubmitting?: boolean;
  onSubmit: () => void;
  /** The last successful decision, if any (auto_approved/approved/partially_approved/pending_review/denied). */
  result?: AugmentationRequest | null;
  /** HTTP status of the last thrown error, when the mutation itself failed (network/5xx/403). */
  errorStatus?: number;
  /** True once a thrown (non-403) failure can be retried by re-sending the same idempotency key. */
  canRetry?: boolean;
  onRetry?: () => void;
  /** `getMyBudgetRefillLadder`'s result -- (ADR-0015) `allowedAmountsMicros` is the live,
   * admin-configured set the amount picker below reads from. The response also still carries the
   * pre-ADR-0015 `currentTier`/`nextTier`/`ladder` fields (backend removal is a separate,
   * follow-up change -- see the module comment on `packages/hooks/src/budget-tiers.ts`), but this
   * view deliberately reads none of them: under a flat, admin-configured amount set there is no
   * ladder *position* left to display. */
  ladder?: MyBudgetRefillLadder | null;
  isLadderLoading?: boolean;
  isLadderError?: boolean;
  /** The amount currently picked from `ladder.allowedAmountsMicros`, a raw micro-USD decimal
   * string -- `undefined` while nothing has been picked yet (loading/error/empty, or before the
   * screen's default-selection effect has run). Controlled: this view never picks a default
   * itself, matching `ExpirySelector`'s split of "screen owns state, view is presentational". */
  selectedAmountMicros?: string;
  onSelectAmount?: (amountMicros: string) => void;
};

export function BudgetRefillView({
  showBackButton = true,
  onBack,
  canRefill = true,
  period,
  isSubmitting = false,
  onSubmit,
  result = null,
  errorStatus,
  canRetry = false,
  onRetry,
  ladder = null,
  isLadderLoading = false,
  isLadderError = false,
  selectedAmountMicros,
  onSelectAmount,
}: Readonly<BudgetRefillViewProps>) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const isPermissionError = errorStatus === 403;
  const isOtherError = errorStatus !== undefined && !isPermissionError;
  // Submitting without a chosen amount would silently fall back to the pre-ADR-0015 server-side
  // tier derivation (`requestedAmountMicros` is optional on the wire) -- since this screen is now
  // a picker, that fallback would contradict what the UI just showed the caller, so submit stays
  // disabled until a real amount is selected, not merely until the ladder query settles.
  const isSubmitDisabled = isSubmitting || !selectedAmountMicros;
  const submitLabel = isSubmitting
    ? t('settings.budget.submitting')
    : selectedAmountMicros
      ? t('settings.budget.submitWithAmount', { amount: formatMicroUsd(selectedAmountMicros) })
      : t('settings.budget.submit');

  const renderResult = () => {
    if (isPermissionError) {
      return (
        <Callout
          tone="error"
          icon={<Feather name="lock" size={designTokens.icon.action} color={colors.error} />}>
          {t('settings.budget.permissionDenied')}
        </Callout>
      );
    }

    if (isOtherError) {
      return (
        <Stack gap="sm">
          <Callout
            tone="error"
            icon={
              <Feather name="alert-triangle" size={designTokens.icon.action} color={colors.error} />
            }>
            {t('settings.budget.retryHint')}
          </Callout>
          {canRetry ? (
            <Button
              variant="neutral"
              size="sm"
              onPress={onRetry}
              disabled={isSubmitting}
              style={{ alignSelf: 'flex-start' }}>
              {t('settings.budget.retry')}
            </Button>
          ) : null}
        </Stack>
      );
    }

    if (!result) {
      return null;
    }

    // The tier is revealed from the RESPONSE, never chosen by the caller -- `request_refill`
    // decides it server-side (see budget-tiers.ts's module comment). Shown for every outcome, not
    // just a grant, since it's the answer to "what did I actually request" regardless of decision.
    const requestedLine = (
      <Text intent="caption">
        {t('settings.budget.requestedTierLabel', { amount: requestedTierLabel(result) })}
      </Text>
    );

    if (
      result.status === 'auto_approved' ||
      result.status === 'approved' ||
      result.status === 'partially_approved'
    ) {
      return (
        <Stack gap="sm">
          {requestedLine}
          <Callout
            tone="success"
            icon={
              <Feather name="check-circle" size={designTokens.icon.action} color={colors.success} />
            }>
            {t('settings.budget.tokenRefreshNotice')}
          </Callout>
          {result.approvedAmountMicros ? (
            <Text intent="caption">
              {t('settings.budget.approvedAmountLabel', {
                amount: formatMicroUsd(result.approvedAmountMicros),
              })}
            </Text>
          ) : null}
        </Stack>
      );
    }

    if (result.status === 'pending_review') {
      return (
        <Stack gap="sm">
          {requestedLine}
          <Callout
            tone="warning"
            icon={
              <Feather name="clock" size={designTokens.icon.action} color={colors.secondary} />
            }>
            {t('settings.budget.pendingReview')}
          </Callout>
        </Stack>
      );
    }

    if (result.status === 'denied') {
      const reasonCode = result.policyReasonCodes.find(
        (code) => code in DENIED_REASON_CODE_I18N_KEYS
      );
      const deniedCopy = result.rejectionReason
        ? result.rejectionReason
        : reasonCode
          ? t(DENIED_REASON_CODE_I18N_KEYS[reasonCode])
          : t('settings.budget.deniedGenericReason');

      return (
        <Stack gap="sm">
          {requestedLine}
          <Callout
            tone="error"
            icon={<Feather name="x-circle" size={designTokens.icon.action} color={colors.error} />}>
            {deniedCopy}
          </Callout>
        </Stack>
      );
    }

    return null;
  };

  return (
    <Div tone="muted" width="full" style={{ flex: 1 }}>
      {showBackButton ? (
        <PageHeader
          title={t('settings.budget.title')}
          leading={
            <Stack direction="row" align="center" gap="sm">
              <Button
                variant="ghost"
                size="iconSm"
                onPress={onBack}
                accessibilityLabel={t('apiKeys.back')}>
                <Feather name="arrow-left" size={designTokens.icon.nav} color={colors.ink} />
              </Button>
              <Text intent="caption">{t('nav.settings')}</Text>
              <Feather name="chevron-right" size={14} color={colors.subtle} />
            </Stack>
          }
        />
      ) : null}

      <Scroll tone="muted" pad="md" style={{ flex: 1 }}>
        <Stack gap="lg">
          {!showBackButton ? <Heading tone="title">{t('settings.budget.title')}</Heading> : null}
          <Text intent="body">{t('settings.budget.subtitle')}</Text>

          {!canRefill ? (
            <Card size="md">
              <Callout
                tone="error"
                icon={<Feather name="lock" size={designTokens.icon.action} color={colors.error} />}>
                {t('settings.budget.permissionDenied')}
              </Callout>
            </Card>
          ) : (
            <>
              {/* Non-negotiable per the maintainer (see the i18n key's own comment): must be
                  visible whether or not the caller has ever submitted a refill -- so this renders
                  unconditionally here, not gated on the ladder query the old ladder-visibility
                  panel used to tie it to (the copy itself needs no ladder data at all). */}
              <Callout
                tone="info"
                icon={
                  <Feather name="info" size={designTokens.icon.action} color={colors.accent} />
                }>
                {t('settings.budget.enforcementGapNotice')}
              </Callout>

              <SectionCard
                title={t('settings.budget.requestSection')}
                description={t('settings.budget.requestSectionDescription')}>
                <Stack gap="md" align="start" width="full">
                  <Text intent="caption">{t('settings.budget.periodLabel', { period })}</Text>
                  <FormField label={t('settings.budget.amountLabel')}>
                    <AmountPicker
                      ladder={ladder}
                      isLoading={isLadderLoading}
                      isError={isLadderError}
                      value={selectedAmountMicros}
                      onChange={onSelectAmount}
                      disabled={isSubmitting}
                      colors={colors}
                      t={t}
                    />
                  </FormField>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isSubmitDisabled}
                    onPress={onSubmit}
                    style={{ alignSelf: 'flex-start' }}>
                    {submitLabel}
                  </Button>
                </Stack>
              </SectionCard>

              {renderResult() ? <Card size="sm">{renderResult()}</Card> : null}
            </>
          )}
        </Stack>
      </Scroll>
    </Div>
  );
}
