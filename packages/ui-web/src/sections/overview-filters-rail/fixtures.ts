// overview.svg's FILTERS dropdown options, moved here from the deleted `pages/overview/fixtures.ts`.

import type { RailSelectOption } from '../../components/rail-select';

export const ACCOUNT_FILTER_OPTIONS: RailSelectOption[] = [
  { value: 'adorsys-gis', label: 'adorsys-gis' },
];

export const PROJECT_FILTER_OPTIONS: RailSelectOption[] = [
  { value: 'all', label: 'All projects' },
  { value: 'gateway-prod', label: 'gateway-prod' },
  { value: 'gateway-staging', label: 'gateway-staging' },
];

export const MODEL_FILTER_OPTIONS: RailSelectOption[] = [
  { value: 'all', label: 'All models' },
  { value: 'gpt-4o-mini', label: 'gpt-4o-mini' },
  { value: 'claude-sonnet', label: 'claude-sonnet' },
  { value: 'llama-3.1-70b', label: 'llama-3.1-70b' },
  { value: 'embed-3', label: 'embed-3' },
];
