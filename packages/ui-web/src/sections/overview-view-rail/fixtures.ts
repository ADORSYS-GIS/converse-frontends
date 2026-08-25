// overview.svg's VIEW dropdown options, moved here from the deleted `pages/overview/fixtures.ts`.

import type { RailSelectOption } from '../../components/rail-select';

export const RANGE_OPTIONS: RailSelectOption[] = [
  { value: 'last-7', label: 'Last 7 days' },
  { value: 'last-30', label: 'Last 30 days' },
  { value: 'last-90', label: 'Last 90 days' },
];

export const BUCKET_OPTIONS: RailSelectOption[] = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
];

export const GROUP_BY_OPTIONS: RailSelectOption[] = [
  { value: 'project', label: 'Project' },
  { value: 'project-model', label: 'Project × Model' },
  { value: 'model', label: 'Model' },
];
