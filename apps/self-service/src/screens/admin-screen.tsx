import React from 'react';

import { BudgetReviewScreen } from './budget-review-screen';

/**
 * The `Admin` nav-spine group (ADR 0008 Decision 4) — visible only to a caller holding the
 * `lightbridge-admin` role (gated one level up, in `tab-routes.ts`/`responsive-tab-bar.tsx`, on
 * the `budget:review` permission that only that role carries — see
 * `packages/hooks/src/rbac.ts`'s `DEFAULT_ROLE_PERMISSIONS`).
 *
 * Today the admin review queue (`BudgetReviewScreen`) is the only admin-gated surface this app
 * has, so it *is* the Admin tab's content. `BudgetReviewScreen` re-checks `budget:review` itself
 * before rendering real data (defense in depth against a non-admin reaching this route directly,
 * e.g. by URL) — see that screen's `canReview` check.
 */
export function AdminScreen() {
  return <BudgetReviewScreen />;
}
