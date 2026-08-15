import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  createBudgetIdempotencyKey,
  getApiErrorStatus,
  useCurrentAccount,
  usePermissions,
  useRequestBudgetRefill,
} from '@lightbridge/hooks';
import type { BudgetTier } from '@lightbridge/hooks';
import { BudgetRefillView } from '../views/settings/budget-refill-view';

/**
 * Self-service budget refill (lightbridge-authz ADR-0007/0008, #191). Budget is account-scoped,
 * not project-scoped, so unlike the project-settings/api-keys screens this deliberately has no
 * account/project selector -- it always acts on the caller's own account
 * (`useCurrentAccount`, one account per person per ADR-0006).
 */
export function BudgetRefillScreen({ embedded = false }: Readonly<{ embedded?: boolean }>) {
  const router = useRouter();
  const { has } = usePermissions();
  const canRefill = has('budget:self-refill');

  const { data: account } = useCurrentAccount();
  const requestRefill = useRequestBudgetRefill();

  const [selectedTier, setSelectedTier] = useState<BudgetTier | undefined>();
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);

  const submit = (tier: BudgetTier, key: string) => {
    if (!account?.id) return;
    setSelectedTier(tier);
    setIdempotencyKey(key);
    // `tier` is intentionally not part of this payload -- `RequestBudgetRefillInput`
    // (packages/authz-rpc/schema/authz.cstack) has no field for the caller to specify which
    // tier/amount they want. See the comment on `RequestBudgetRefillArgs` in
    // packages/hooks/src/budget.ts for the full explanation; this is a real backend-contract gap,
    // not an oversight here.
    void requestRefill
      .mutateAsync({ accountId: account.id, idempotencyKey: key })
      .catch(() => undefined);
  };

  const handleSelectTier = (tier: BudgetTier) => {
    // Every tile click starts a brand-new attempt -- always a fresh idempotency key, never reused
    // for a fresh submit (only `handleRetry` below reuses one).
    submit(tier, createBudgetIdempotencyKey());
  };

  const handleRetry = () => {
    if (!selectedTier || !idempotencyKey) return;
    // Retries the exact same failed attempt -- reuses the SAME idempotency key so the backend's
    // `RefillService::find_existing` recognizes it rather than evaluating a second time.
    submit(selectedTier, idempotencyKey);
  };

  const isSubmitting = requestRefill.isPending;
  // Don't show a stale result/error from the previous attempt while a new one is in flight.
  const errorStatus = isSubmitting ? undefined : getApiErrorStatus(requestRefill.error);
  const result = isSubmitting ? null : (requestRefill.data ?? null);
  // 403 is a hard permission denial, not retryable; any other thrown error is (network/5xx).
  const canRetry = errorStatus !== undefined && errorStatus !== 403;

  return (
    <BudgetRefillView
      showBackButton={!embedded}
      onBack={() => router.back()}
      canRefill={canRefill}
      selectedTier={selectedTier}
      isSubmitting={isSubmitting}
      onSelectTier={handleSelectTier}
      result={result}
      errorStatus={errorStatus}
      canRetry={canRetry}
      onRetry={handleRetry}
    />
  );
}
