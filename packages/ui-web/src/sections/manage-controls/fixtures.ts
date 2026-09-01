// manage-projects.svg's filter options, moved here from the deleted `manage-filters-rail/fixtures.ts`.

import type { SegmentedOption } from '../../components/segmented-control';
import type { ManageOption } from './types';

/**
 * `ManageControls` no longer has an Account select of its own (live findings #6, 2026-08-30) —
 * account scope is the sidebar workspace switcher's alone now — but this list survives as the
 * seed data for `refine-mock/mock-data-provider.ts`'s `accounts` resource (`ScopeSelect` and the
 * workspace switcher both still need a real account catalogue to pick from in Storybook). Kept
 * here rather than moved, since it is still "the demo account roster" wherever a section needs
 * one.
 */
export const manageAccountOptions: ManageOption[] = [
  { value: 'all', label: 'All accounts' },
  { value: 'adorsys-gis', label: 'adorsys-gis' },
  { value: 'adorsys-labs', label: 'adorsys-labs' },
  { value: 'adorsys-emea', label: 'adorsys-emea' },
];

// Values match the real backend enum (`authz.cstack` — `disableProject`/`enableProject`) and the
// `MANAGE_STATUSES`/`MANAGE_BUDGET_STATES` URL contract (`apps/console/src/client/url-state.ts`):
// `archived` never existed on the backend (issue #268), and "budget state" now reflects whether a
// governance quota tier is assigned, not a numeric ceiling that was never real (issue #269).
export const manageStatusOptions: SegmentedOption<string>[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
];

export const manageBudgetStateOptions: ManageOption[] = [
  { value: 'all', label: 'Any budget state' },
  { value: 'quota-set', label: 'Quota set' },
  { value: 'no-quota', label: 'No quota' },
];
