import React from 'react';

import { useTokenUsage } from '@lightbridge/hooks';
import { UsageView } from '../views/usage-view';

export function UsageScreen() {
  const { data = [] } = useTokenUsage();

  return <UsageView usage={data} />;
}
