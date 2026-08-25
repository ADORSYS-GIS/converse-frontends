// api-keys.svg's status filter, moved here from the deleted `pages/api-keys/fixtures.ts`.

import type { SegmentedOption } from '../../components/segmented-control';

export const apiKeysStatusFilterOptions: SegmentedOption<string>[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'revoked', label: 'Revoked' },
];
