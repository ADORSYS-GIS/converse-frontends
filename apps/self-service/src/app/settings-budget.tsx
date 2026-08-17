import React from 'react';
import { BudgetRefillScreen } from '../screens/budget-refill-screen';
import { RouteErrorBoundary } from '../components/route-error-boundary';

export default function SettingsBudgetRoute() {
  return (
    <RouteErrorBoundary>
      <BudgetRefillScreen />
    </RouteErrorBoundary>
  );
}
