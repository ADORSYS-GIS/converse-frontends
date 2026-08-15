import React, { useState } from 'react';
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
  Skeleton,
  Stack,
  Text,
  TextField,
  EmptyState,
} from '@lightbridge/ui';
import type { AugmentationRequest } from '@lightbridge/hooks';
// Pure helper only, from the dependency-free `./budget-tiers` subpath -- NOT the `@lightbridge/hooks`
// barrel, which pulls in `@lightbridge/authz-rpc` (and transitively `cborg`, which Jest's resolver
// can't follow) at runtime. See packages/hooks/src/budget-tiers.ts's module-level comment.
import { formatMicroUsd } from '@lightbridge/hooks/budget-tiers';
import { useThemeColors } from '../../hooks/use-theme-colors';
import { formatDate } from '../api-keys-list-view';

export type BudgetReviewViewProps = {
  showBackButton?: boolean;
  onBack: () => void;
  /** `usePermissions().has('budget:review')` -- defensive re-check, not just the hidden nav entry. */
  canReview?: boolean;
  items?: AugmentationRequest[];
  isLoading?: boolean;
  onApprove: (requestId: string) => void;
  onReject: (requestId: string, reason: string) => void;
  /** Per-request in-flight state, keyed by `requestId` -- only the acted-on row disables. */
  pendingRequestId?: string | null;
  actionError?: string | null;
};

export function BudgetReviewView({
  showBackButton = true,
  onBack,
  canReview = true,
  items = [],
  isLoading = false,
  onApprove,
  onReject,
  pendingRequestId = null,
  actionError = null,
}: Readonly<BudgetReviewViewProps>) {
  const { t, i18n } = useTranslation();
  const colors = useThemeColors();
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>({});

  const setReasonDraft = (requestId: string, value: string) =>
    setReasonDrafts((prev) => ({ ...prev, [requestId]: value }));

  return (
    <Div tone="muted" width="full" style={{ flex: 1 }}>
      {showBackButton ? (
        <PageHeader
          title={t('settings.budgetReview.title')}
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
          {!showBackButton ? <Heading tone="title">{t('settings.budgetReview.title')}</Heading> : null}
          <Text intent="body">{t('settings.budgetReview.subtitle')}</Text>

          {!canReview ? (
            <Card size="md">
              <Callout
                tone="error"
                icon={<Feather name="lock" size={designTokens.icon.action} color={colors.error} />}>
                {t('settings.budgetReview.permissionDenied')}
              </Callout>
            </Card>
          ) : (
            <>
              {actionError ? (
                <Callout
                  tone="error"
                  icon={
                    <Feather name="alert-triangle" size={designTokens.icon.action} color={colors.error} />
                  }>
                  {actionError}
                </Callout>
              ) : null}

              {isLoading ? (
                <Stack gap="md">
                  {[0, 1].map((key) => (
                    <Card key={key} size="md">
                      <Stack gap="md">
                        <Skeleton width="45%" height={16} />
                        <Skeleton width="65%" height={12} />
                        <Stack direction="row" gap="sm" width="full">
                          <Skeleton height={36} rounded="xl" style={{ flex: 1 }} />
                          <Skeleton height={36} rounded="xl" style={{ flex: 1 }} />
                        </Stack>
                      </Stack>
                    </Card>
                  ))}
                </Stack>
              ) : items.length === 0 ? (
                <Card size="md">
                  <EmptyState
                    icon={<Feather name="inbox" size={28} color={colors.subtle} />}
                    title={t('settings.budgetReview.empty')}
                  />
                </Card>
              ) : (
                <Stack gap="md">
                  {items.map((item) => {
                    const isActing = pendingRequestId === item.id;
                    const reasonDraft = reasonDrafts[item.id] ?? '';
                    const trimmedReason = reasonDraft.trim();

                    return (
                      <Card key={item.id} size="md">
                        <Stack gap="md">
                          <Stack direction="row" align="center" justify="between" gap="sm">
                            <Text intent="bodyStrong">
                              {t('settings.budgetReview.requestedLabel', {
                                amount: formatMicroUsd(item.requestedAmountMicros),
                              })}
                            </Text>
                            <Badge tone="warning">{t('settings.budgetReview.statusPending')}</Badge>
                          </Stack>

                          <Stack direction="row" gap="md" wrap="wrap">
                            <Text intent="caption">
                              {t('settings.budgetReview.requestedFor', { accountId: item.accountId })}
                            </Text>
                            <Text intent="caption">
                              {t('settings.budgetReview.periodLabel', { period: item.period })}
                            </Text>
                            <Text intent="caption">
                              {t('settings.budgetReview.createdOn', {
                                date: formatDate(item.createdAt, i18n.language),
                              })}
                            </Text>
                          </Stack>

                          <Stack direction="row" gap="sm" width="full">
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={isActing}
                              onPress={() => onApprove(item.id)}
                              accessibilityLabel={t('settings.budgetReview.approveNamed', {
                                id: item.id,
                              })}
                              style={{ flex: 1 }}>
                              {isActing
                                ? t('settings.budgetReview.approving')
                                : t('settings.budgetReview.approve')}
                            </Button>
                          </Stack>

                          <Stack gap="xs">
                            <TextField
                              value={reasonDraft}
                              onChangeText={(value) => setReasonDraft(item.id, value)}
                              placeholder={t('settings.budgetReview.reasonPlaceholder')}
                              editable={!isActing}
                              multiline
                              accessibilityLabel={t('settings.budgetReview.reasonPlaceholder')}
                            />
                            <Button
                              variant="danger"
                              size="sm"
                              disabled={isActing || trimmedReason.length === 0}
                              onPress={() => onReject(item.id, trimmedReason)}
                              accessibilityLabel={t('settings.budgetReview.rejectNamed', {
                                id: item.id,
                              })}
                              style={{ alignSelf: 'flex-start' }}>
                              {isActing
                                ? t('settings.budgetReview.rejecting')
                                : t('settings.budgetReview.reject')}
                            </Button>
                            {trimmedReason.length === 0 ? (
                              <Text intent="caption" style={{ color: colors.subtle }}>
                                {t('settings.budgetReview.reasonRequired')}
                              </Text>
                            ) : null}
                          </Stack>
                        </Stack>
                      </Card>
                    );
                  })}
                </Stack>
              )}
            </>
          )}
        </Stack>
      </Scroll>
    </Div>
  );
}
