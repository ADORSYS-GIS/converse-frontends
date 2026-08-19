import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  createBudgetIdempotencyKey,
  currentBudgetPeriod,
  getApiErrorStatus,
  useCurrentAccount,
  useMyBudgetRefillLadder,
  usePermissions,
  useRequestBudgetRefill,
} from '@lightbridge/hooks';
import { BudgetRefillView } from '../views/settings/budget-refill-view';

/**
 * Self-service budget refill (lightbridge-authz ADR-0007/0008, #191; ladder-visibility follow-up,
 * ADR-0015 amount picker). Budget is account-scoped, not project-scoped, so unlike the
 * project-settings/api-keys screens this deliberately has no account/project selector -- it
 * always acts on the caller's own account (`useCurrentAccount`, one account per person per
 * ADR-0006).
 *
 * ADR-0015 (lightbridge-authz#386) reversed the "caller chooses nothing" model #148/#185 were
 * built under -- this screen is NOW a picker. `useMyBudgetRefillLadder`'s `allowedAmountsMicros`
 * is the live, admin-configured set of amounts the active policy currently offers -- read from
 * that response on every render, never a hardcoded list here; a hardcoded mirror is exactly the
 * drift class that left `packages/hooks/src/budget-tiers.ts`'s static ladder inert as a display
 * table and `allowed_models` silently inert for months on the backend side (lightbridge-authz
 * #282/#283). The selected value is sent as `requestBudgetRefill`'s `requestedAmountMicros`;
 * policy alone still decides auto-approve vs. `pending_review` vs. denial -- picking an amount
 * only states what is being REQUESTED, never what will be granted (see
 * `budget-refill-view.tsx`'s submit-button copy for how that's kept truthful).
 */
export function BudgetRefillScreen({ embedded = false }: Readonly<{ embedded?: boolean }>) {
  const router = useRouter();
  const { has } = usePermissions();
  const canRefill = has('budget:self-refill');

  const { data: account } = useCurrentAccount();
  const requestRefill = useRequestBudgetRefill();

  // Stable for the lifetime of this screen instance -- the current calendar month at mount.
  const period = useMemo(() => currentBudgetPeriod(), []);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);

  const ladderQuery = useMyBudgetRefillLadder(period, canRefill);
  const allowedAmounts = ladderQuery.data?.allowedAmountsMicros ?? [];

  // The amount the caller has picked, sourced only from the live `allowedAmountsMicros` set --
  // `undefined` means "nothing picked yet". Seeded to the first offered amount once the ladder
  // loads (mirrors `ApiKeyCreateView`'s billing-plan default-selection effect), and only while
  // nothing has been picked yet so a background refetch never overwrites a caller's own choice.
  const [selectedAmountMicros, setSelectedAmountMicros] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (selectedAmountMicros === undefined && allowedAmounts.length > 0) {
      setSelectedAmountMicros(allowedAmounts[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedAmounts]);

  const submit = (key: string) => {
    if (!account?.id || !selectedAmountMicros) return;
    setIdempotencyKey(key);
    void requestRefill
      .mutateAsync({
        accountId: account.id,
        period,
        idempotencyKey: key,
        requestedAmountMicros: selectedAmountMicros,
      })
      .catch(() => undefined);
  };

  const handleSubmit = () => {
    // Every submit starts a brand-new attempt -- always a fresh idempotency key, never reused for
    // a fresh submit (only `handleRetry` below reuses one).
    submit(createBudgetIdempotencyKey());
  };

  const handleRetry = () => {
    if (!idempotencyKey) return;
    // Retries the exact same failed attempt -- reuses the SAME idempotency key (and the SAME
    // amount already selected when the original attempt was submitted) so the backend's
    // `RefillService::find_existing` recognizes it rather than evaluating a second time.
    submit(idempotencyKey);
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
      period={period}
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit}
      result={result}
      errorStatus={errorStatus}
      canRetry={canRetry}
      onRetry={handleRetry}
      ladder={ladderQuery.data ?? null}
      isLadderLoading={ladderQuery.isLoading}
      isLadderError={ladderQuery.isError}
      selectedAmountMicros={selectedAmountMicros}
      onSelectAmount={setSelectedAmountMicros}
    />
  );
}
