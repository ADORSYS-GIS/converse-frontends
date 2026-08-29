// Overview's toolbar options, consolidated from the deleted `overview-view-rail/fixtures.ts` and
// `overview-filters-rail/fixtures.ts` — one toolbar now, so one fixtures file.
//
// `ACCOUNT_FILTER_OPTIONS` is deliberately NOT carried over: account is no longer a filter on
// this screen (see `component.tsx` on why scope is identity, not a parameter).

import type { SelectFieldOption } from '../../components/select-field';

export const RANGE_OPTIONS: SelectFieldOption[] = [
  { value: 'last-7', label: 'Last 7 days' },
  { value: 'last-30', label: 'Last 30 days' },
  { value: 'last-90', label: 'Last 90 days' },
];

export const BUCKET_OPTIONS: SelectFieldOption[] = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
];

export const GROUP_BY_OPTIONS: SelectFieldOption[] = [
  { value: 'project', label: 'Project' },
  { value: 'project-model', label: 'Project × Model' },
  { value: 'model', label: 'Model' },
];

export const PROJECT_FILTER_OPTIONS: SelectFieldOption[] = [
  { value: 'all', label: 'All projects' },
  { value: 'gateway-prod', label: 'gateway-prod' },
  { value: 'gateway-staging', label: 'gateway-staging' },
];

export const MODEL_FILTER_OPTIONS: SelectFieldOption[] = [
  { value: 'all', label: 'All models' },
  { value: 'gpt-4o-mini', label: 'gpt-4o-mini' },
  { value: 'claude-sonnet', label: 'claude-sonnet' },
  { value: 'llama-3.1-70b', label: 'llama-3.1-70b' },
  { value: 'embed-3', label: 'embed-3' },
];
