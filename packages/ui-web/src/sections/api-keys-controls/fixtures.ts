// Api-Keys toolbar options, carried over from the deleted `api-keys-filters-rail/fixtures.ts`.

import type { SegmentedOption } from '../../components/segmented-control';
import type { SelectFieldOption } from '../../components/select-field';

export const API_KEY_STATUS_OPTIONS: SegmentedOption<string>[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'revoked', label: 'Revoked' },
];

export const API_KEY_PROJECT_OPTIONS: SelectFieldOption[] = [
  { value: 'all', label: 'All projects' },
  { value: 'gateway-prod', label: 'gateway-prod' },
  { value: 'gateway-edge', label: 'gateway-edge' },
];
