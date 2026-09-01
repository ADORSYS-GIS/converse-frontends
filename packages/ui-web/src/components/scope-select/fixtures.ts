// Scope fixtures for the screens that still pick a project inside a rail (Manage).
//
// Previously lived in `sections/scope-rail/fixtures.ts`. That section — the LEFT rail's read-only
// scope echo — was deleted in the owner review of 2026-08-29 (it was the third of four renderings
// of the same account on one screen), but `ScopeSelect` itself survives, so its fixtures move
// here, beside the component they configure, rather than to another section that merely uses it.

import type { ScopeProjectOption, ScopeSelectValue } from './types';

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
