// The scope echo shown in api-keys.svg, moved here from the deleted `pages/api-keys/fixtures.ts`.

import type { ScopeProjectOption, ScopeSelectValue } from '../../components/scope-select';
import type { ScopeRailProps } from './types';

export const scopeRailFixture: ScopeRailProps = {
  accountLabel: 'adorsys-gis',
  projectLabel: 'gateway-prod',
};

export const scopeSelectValue: ScopeSelectValue = {
  accountId: 'adorsys-gis',
  projectId: 'gateway-prod',
};

export const scopeAccounts = [
  { id: 'adorsys-gis', label: 'adorsys-gis' },
  { id: 'adorsys-labs', label: 'adorsys-labs' },
];

export const scopeProjects: ScopeProjectOption[] = [
  { id: 'gateway-prod', label: 'gateway-prod', accountId: 'adorsys-gis' },
  { id: 'gateway-edge', label: 'gateway-edge', accountId: 'adorsys-gis' },
  { id: 'agent-sandbox', label: 'agent-sandbox', accountId: 'adorsys-labs' },
];
