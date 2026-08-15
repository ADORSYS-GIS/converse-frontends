import React from 'react';
import { useTranslation } from '@lightbridge/i18n';
import {
  Badge,
  Button,
  Callout,
  Card,
  designTokens,
  Div,
  Heading,
  Icon as Feather,
  PageHeader,
  Scroll,
  SectionCard,
  Stack,
  Text,
} from '@lightbridge/ui';
import type { AugmentationRequest } from '@lightbridge/hooks';
// Pure helpers only, from the dependency-free `./budget-tiers` subpath -- NOT the `@lightbridge/hooks`
// barrel, which pulls in `@lightbridge/authz-rpc` (and transitively `cborg`, which Jest's resolver
// can't follow) at runtime. See packages/hooks/src/budget-tiers.ts's module-level comment.
import type { BudgetTier } from '@lightbridge/hooks/budget-tiers';
import { BUDGET_TIERS, formatBudgetTierAmount, formatMicroUsd } from '@lightbridge/hooks/budget-tiers';
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

export type BudgetRefillViewProps = {
  showBackButton?: boolean;
  onBack: () => void;
  /** `usePermissions().has('budget:self-refill')` -- defensive re-check, not just the hidden nav entry. */
  canRefill?: boolean;
  selectedTier?: BudgetTier;
  isSubmitting?: boolean;
  onSelectTier: (tier: BudgetTier) => void;
  /** The last successful decision, if any (auto_approved/approved/partially_approved/pending_review/denied). */
  result?: AugmentationRequest | null;
  /** HTTP status of the last thrown error, when the mutation itself failed (network/5xx/403). */
  errorStatus?: number;
  /** True once a thrown (non-403) failure can be retried by re-sending the same idempotency key. */
  canRetry?: boolean;
  onRetry?: () => void;
};

export function BudgetRefillView({
  showBackButton = true,
  onBack,
  canRefill = true,
  selectedTier,
  isSubmitting = false,
  onSelectTier,
  result = null,
  errorStatus,
  canRetry = false,
  onRetry,
}: Readonly<BudgetRefillViewProps>) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const isPermissionError = errorStatus === 403;
  const isOtherError = errorStatus !== undefined && !isPermissionError;

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

    if (
      result.status === 'auto_approved' ||
      result.status === 'approved' ||
      result.status === 'partially_approved'
    ) {
      return (
        <Stack gap="sm">
          <Callout
            tone="success"
            icon={<Feather name="check-circle" size={designTokens.icon.action} color={colors.success} />}>
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
        <Callout
          tone="warning"
          icon={<Feather name="clock" size={designTokens.icon.action} color={colors.secondary} />}>
          {t('settings.budget.pendingReview')}
        </Callout>
      );
    }

    if (result.status === 'denied') {
      const reasonCode = result.policyReasonCodes.find((code) => code in DENIED_REASON_CODE_I18N_KEYS);
      const deniedCopy = result.rejectionReason
        ? result.rejectionReason
        : reasonCode
          ? t(DENIED_REASON_CODE_I18N_KEYS[reasonCode])
          : t('settings.budget.deniedGenericReason');

      return (
        <Callout
          tone="error"
          icon={<Feather name="x-circle" size={designTokens.icon.action} color={colors.error} />}>
          {deniedCopy}
        </Callout>
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
              <SectionCard
                title={t('settings.budget.tierSection')}
                description={t('settings.budget.tierSectionDescription')}>
                <Stack direction="row" wrap="wrap" gap="sm" accessibilityRole="radiogroup">
                  {BUDGET_TIERS.map((tier) => {
                    const isSelected = tier === selectedTier;
                    return (
                      <Button
                        key={tier}
                        variant={isSelected ? 'primary' : 'neutral'}
                        size="md"
                        disabled={isSubmitting}
                        onPress={() => onSelectTier(tier)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isSelected, disabled: isSubmitting }}
                        accessibilityLabel={t('settings.budget.selectTier', {
                          amount: formatBudgetTierAmount(tier),
                        })}
                        style={{ minWidth: 88 }}>
                        {formatBudgetTierAmount(tier)}
                      </Button>
                    );
                  })}
                </Stack>
                {isSubmitting ? (
                  <Stack direction="row" gap="sm" align="center" top="md">
                    <Badge tone="neutral">{t('settings.budget.submitting')}</Badge>
                  </Stack>
                ) : null}
              </SectionCard>

              {renderResult() ? <Card size="sm">{renderResult()}</Card> : null}
            </>
          )}
        </Stack>
      </Scroll>
    </Div>
  );
}
