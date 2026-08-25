// api-keys.svg's hygiene counts, moved here from the deleted `pages/api-keys/fixtures.ts`.

import type { ApiKeysHygiene } from './types';

export const apiKeysHygiene: ApiKeysHygiene = {
  expiringCount: 1,
  expiringInDays: 6,
  neverUsedCount: 1,
  revokedRetainedCount: 4,
};

export const apiKeysCleanHygiene: ApiKeysHygiene = {
  expiringCount: 0,
  expiringInDays: 0,
  neverUsedCount: 0,
  revokedRetainedCount: 0,
};
