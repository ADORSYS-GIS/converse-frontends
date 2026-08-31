// Overview's toolbar options, consolidated from the deleted `overview-view-rail/fixtures.ts` and
// `overview-filters-rail/fixtures.ts` — one toolbar now, so one fixtures file.
//
// `ACCOUNT_FILTER_OPTIONS` is deliberately NOT carried over: account is no longer a filter on
// this screen (see `component.tsx` on why scope is identity, not a parameter).

import type { DateRangePreset } from '../../components/date-range-field';
import type { SelectFieldOption } from '../../components/select-field';

// 'mtd' ("this month") is listed and defaulted to first, matching the real Overview screen's
// default range (`url-state.ts`'s `OVERVIEW_RANGES`/`overviewParsers.range` — the budget resets
// monthly, so the dashboard defaults to the billing window, not an arbitrary rolling span).
export const RANGE_PRESETS: DateRangePreset[] = [
  { value: 'mtd', label: 'This month', days: 'mtd' },
  { value: '7d', label: 'Last 7 days', days: 7 },
  { value: '30d', label: 'Last 30 days', days: 30 },
  { value: '90d', label: 'Last 90 days', days: 90 },
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
