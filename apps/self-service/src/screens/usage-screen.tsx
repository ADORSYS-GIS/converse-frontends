import React from 'react';

import { useTokenUsage, useQueryUsage } from '@lightbridge/hooks';
import { UsageView } from '../views/usage-view';

export function UsageScreen() {
  const { data = [] } = useTokenUsage();
  useQueryUsage();

  return <UsageView usage={data} />;
}
