import type { NavSpineItem } from '../../components/nav-spine';
import type { SegmentedOption } from '../../components/segmented-control';
import type { SubNavItem } from '../../components/sub-nav';
import type { ManageOption, ManageTotals, ProjectRow } from './types';

// manage-projects.svg — the 12-row ledger shown in the mockup (two archived rows at the tail).
export const manageProjectsFixture: ProjectRow[] = [
  { id: 'gateway-prod', name: 'gateway-prod', account: 'adorsys-gis', members: 8, keys: 11, spendMtd: 455.2, ceiling: 500, usedPercent: 91, status: 'near ceiling', statusLabel: 'near ceiling' },
  { id: 'gateway-edge', name: 'gateway-edge', account: 'adorsys-gis', members: 8, keys: 4, spendMtd: 188.04, ceiling: 500, usedPercent: 38, status: 'active', statusLabel: 'active' },
  { id: 'batch-eval', name: 'batch-eval', account: 'adorsys-gis', members: 4, keys: 3, spendMtd: 142.55, ceiling: 250, usedPercent: 57, status: 'active', statusLabel: 'active' },
  { id: 'rag-catalogue', name: 'rag-catalogue', account: 'adorsys-gis', members: 6, keys: 2, spendMtd: 96.4, ceiling: 250, usedPercent: 39, status: 'active', statusLabel: 'active' },
  { id: 'support-copilot', name: 'support-copilot', account: 'adorsys-labs', members: 3, keys: 2, spendMtd: 74.18, ceiling: 150, usedPercent: 49, status: 'active', statusLabel: 'active' },
  { id: 'voice-transcribe', name: 'voice-transcribe', account: 'adorsys-labs', members: 3, keys: 1, spendMtd: 52.9, ceiling: 150, usedPercent: 35, status: 'active', statusLabel: 'active' },
  { id: 'doc-extract', name: 'doc-extract', account: 'adorsys-labs', members: 2, keys: 2, spendMtd: 41.66, ceiling: 150, usedPercent: 28, status: 'active', statusLabel: 'active' },
  { id: 'agent-sandbox', name: 'agent-sandbox', account: 'adorsys-labs', members: 5, keys: 3, spendMtd: 33.1, ceiling: 100, usedPercent: 33, status: 'active', statusLabel: 'active' },
  { id: 'translate-batch', name: 'translate-batch', account: 'adorsys-emea', members: 2, keys: 1, spendMtd: 28.75, ceiling: 100, usedPercent: 29, status: 'active', statusLabel: 'active' },
  { id: 'ocr-intake', name: 'ocr-intake', account: 'adorsys-emea', members: 2, keys: 1, spendMtd: 19.02, ceiling: 100, usedPercent: 19, status: 'active', statusLabel: 'active' },
  { id: 'legacy-proxy', name: 'legacy-proxy', account: 'adorsys-emea', members: 1, keys: 0, spendMtd: 0, ceiling: null, usedPercent: null, status: 'archived', statusLabel: 'archived' },
  { id: 'pilot-2025', name: 'pilot-2025', account: 'adorsys-emea', members: 1, keys: 0, spendMtd: 0, ceiling: null, usedPercent: null, status: 'archived', statusLabel: 'archived' },
];

export const manageNavItems: NavSpineItem[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'api-keys', label: 'Api-Keys' },
  { key: 'manage', label: 'Manage', active: true },
];

export const manageAdminNavItems: NavSpineItem[] = [{ key: 'admin', label: 'Admin' }];

export const manageSubNavItems: SubNavItem[] = [
  { key: 'projects', label: 'Projects', count: 24, active: true },
  { key: 'accounts', label: 'Accounts', count: 3 },
  { key: 'budgets', label: 'Budgets', count: 24 },
  { key: 'members', label: 'Members', count: 17 },
];

export const manageTotals: ManageTotals = {
  shownLabel: 'TOTAL · 12 SHOWN',
  spendMtd: 1131.8,
  ceiling: 2250,
  usedPercent: 50,
};

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

export const manageLastExports = [
  { filename: '2026-01 · CSV', date: '4 d ago' },
  { filename: '2025-12 · PDF', date: '2026-01-03' },
];
