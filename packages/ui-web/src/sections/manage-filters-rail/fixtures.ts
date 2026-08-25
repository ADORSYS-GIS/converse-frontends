// manage-projects.svg's filter options, moved here from the deleted `pages/manage/fixtures.ts`.

import type { SegmentedOption } from '../../components/segmented-control';
import type { ManageOption } from './types';

export const manageAccountOptions: ManageOption[] = [
  { value: 'all', label: 'All accounts' },
  { value: 'adorsys-gis', label: 'adorsys-gis' },
  { value: 'adorsys-labs', label: 'adorsys-labs' },
  { value: 'adorsys-emea', label: 'adorsys-emea' },
];

export const manageStatusOptions: SegmentedOption<string>[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
];

export const manageBudgetStateOptions: ManageOption[] = [
  { value: 'any', label: 'Any' },
  { value: 'near-ceiling', label: 'Near ceiling' },
  { value: 'over-ceiling', label: 'Over ceiling' },
];
