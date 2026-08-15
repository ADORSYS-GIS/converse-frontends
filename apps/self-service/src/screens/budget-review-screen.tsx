import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  getApiErrorMessage,
  useApproveAugmentationRequest,
  usePendingAugmentationRequests,
  usePermissions,
  useRejectAugmentationRequest,
} from '@lightbridge/hooks';
import { BudgetReviewView } from '../views/settings/budget-review-view';

/**
 * Admin review queue for pending self-service budget refill requests (#191, PR 3.3/3.4).
 * `budgetAccountId` deliberately omitted from `usePendingAugmentationRequests` -- this is the
 * global, cross-account queue, matching `listPendingAugmentationRequests`'s own documented
 * default.
 */
export function BudgetReviewScreen({ embedded = false }: Readonly<{ embedded?: boolean }>) {
  const router = useRouter();
  const { has } = usePermissions();
  const canReview = has('budget:review');

  const { data: items, isLoading } = usePendingAugmentationRequests(undefined, canReview);

  const approve = useApproveAugmentationRequest();
  const reject = useRejectAugmentationRequest();

  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);

  const handleApprove = (requestId: string) => {
    setPendingRequestId(requestId);
    void approve
      .mutateAsync({ requestId })
      .catch(() => undefined)
      .finally(() => setPendingRequestId(null));
  };

  const handleReject = (requestId: string, reason: string) => {
    setPendingRequestId(requestId);
    void reject
      .mutateAsync({ requestId, reason })
      .catch(() => undefined)
      .finally(() => setPendingRequestId(null));
  };

  const actionError = approve.error
    ? getApiErrorMessage(approve.error)
    : reject.error
      ? getApiErrorMessage(reject.error)
      : null;

  return (
    <BudgetReviewView
      showBackButton={!embedded}
      onBack={() => router.back()}
      canReview={canReview}
      items={items}
      isLoading={isLoading}
      onApprove={handleApprove}
      onReject={handleReject}
      pendingRequestId={pendingRequestId}
      actionError={actionError}
    />
  );
}
