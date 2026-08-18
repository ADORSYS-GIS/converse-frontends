import React, { useMemo, useState } from 'react';
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
 * Self-service budget refill (lightbridge-authz ADR-0007/0008, #191; ladder-visibility follow-up).
 * Budget is account-scoped, not project-scoped, so unlike the project-settings/api-keys screens
 * this deliberately has no account/project selector -- it always acts on the caller's own account
 * (`useCurrentAccount`, one account per person per ADR-0006).
 *
 * There is still no tier/amount PICKER here, and deliberately so: `RequestBudgetRefillInput`
 * (packages/authz-rpc/schema/authz.cstack) has no field for the caller to specify one --
 * `RefillService::request_refill` decides the tier server-side (auto grant or `pending_review`)
 * per that schema's own doc comment. `AugmentationRequest.requestedTier` on the RESPONSE is what
 * the server assigned, revealed after the fact, not selected beforehand. Ticket #148's original
 * "tier picker" framing was corrected against this: https://github.com/ADORSYS-GIS/converse-frontends/issues/148#issuecomment-5301445859
 *
 * What DID change: visibility. `useMyBudgetRefillLadder` reads `getMyBudgetRefillLadder` (the
 * read-only companion #148's own comment thread asked lightbridge-authz to add) so this screen can
 * show "you are here, this is next" before the caller ever submits -- still never a choice, just a
 * preview of the same server-side decision `request_refill` makes.
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

  const submit = (key: string) => {
    if (!account?.id) return;
    setIdempotencyKey(key);
    void requestRefill
      .mutateAsync({ accountId: account.id, period, idempotencyKey: key })
      .catch(() => undefined);
  };

  const handleSubmit = () => {
    // Every submit starts a brand-new attempt -- always a fresh idempotency key, never reused for
    // a fresh submit (only `handleRetry` below reuses one).
    submit(createBudgetIdempotencyKey());
  };

  const handleRetry = () => {
    if (!idempotencyKey) return;
    // Retries the exact same failed attempt -- reuses the SAME idempotency key so the backend's
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
    />
  );
}
