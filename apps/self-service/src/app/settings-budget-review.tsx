import React from 'react';
import { BudgetReviewScreen } from '../screens/budget-review-screen';
import { RouteErrorBoundary } from '../components/route-error-boundary';

export default function SettingsBudgetReviewRoute() {
  return (
    <RouteErrorBoundary>
      <BudgetReviewScreen />
    </RouteErrorBoundary>
  );
}
