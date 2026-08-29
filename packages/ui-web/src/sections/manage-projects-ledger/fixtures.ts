// manage-projects.svg — the 12-row ledger shown in the mockup (two suspended rows at the tail).
// Moved here verbatim from the deleted `pages/manage/fixtures.ts`, then brought in line with the
// real backend contract (issues #268/#269/#270): `status` is `active | suspended` only, quota
// tiers are ids from a governance catalog (never currency), MEMBERS/KEYS are gone entirely (the
// list endpoint never returns them, so they could only ever be a fabricated zero), and spend is
// `null` throughout — the fixture matches what `apps/console`'s adapter actually produces today,
// not a hypothetical fully-wired future, since this is the acceptance surface for "the ledger
// tells the truth."
import type { ManageTotals, ProjectRow } from './types';

export const manageProjectsFixture: ProjectRow[] = [
  {
    id: 'gateway-prod',
    name: 'gateway-prod',
    account: 'adorsys-gis',
    spendMtd: null,
    quotaTier: 'scale',
    status: 'active',
    statusLabel: 'active',
  },
  {
    id: 'gateway-edge',
    name: 'gateway-edge',
    account: 'adorsys-gis',
    spendMtd: null,
    quotaTier: 'scale',
    status: 'active',
    statusLabel: 'active',
  },
  {
    id: 'batch-eval',
    name: 'batch-eval',
    account: 'adorsys-gis',
    spendMtd: null,
    quotaTier: 'growth',
    status: 'active',
    statusLabel: 'active',
  },
  {
    id: 'rag-catalogue',
    name: 'rag-catalogue',
    account: 'adorsys-gis',
    spendMtd: null,
    quotaTier: 'growth',
    status: 'active',
    statusLabel: 'active',
  },
  {
    id: 'support-copilot',
    name: 'support-copilot',
    account: 'adorsys-labs',
    spendMtd: null,
    quotaTier: 'growth',
    status: 'active',
    statusLabel: 'active',
  },
  {
    id: 'voice-transcribe',
    name: 'voice-transcribe',
    account: 'adorsys-labs',
    spendMtd: null,
    quotaTier: 'starter',
    status: 'active',
    statusLabel: 'active',
  },
  {
    id: 'doc-extract',
    name: 'doc-extract',
    account: 'adorsys-labs',
    spendMtd: null,
    quotaTier: 'starter',
    status: 'active',
    statusLabel: 'active',
  },
  {
    id: 'agent-sandbox',
    name: 'agent-sandbox',
    account: 'adorsys-labs',
    spendMtd: null,
    quotaTier: 'starter',
    status: 'active',
    statusLabel: 'active',
  },
  {
    id: 'translate-batch',
    name: 'translate-batch',
    account: 'adorsys-emea',
    spendMtd: null,
    quotaTier: 'starter',
    status: 'active',
    statusLabel: 'active',
  },
  {
    id: 'ocr-intake',
    name: 'ocr-intake',
    account: 'adorsys-emea',
    spendMtd: null,
    quotaTier: null,
    status: 'active',
    statusLabel: 'active',
  },
  {
    id: 'legacy-proxy',
    name: 'legacy-proxy',
    account: 'adorsys-emea',
    spendMtd: null,
    quotaTier: null,
    status: 'suspended',
    statusLabel: 'suspended',
  },
  {
    id: 'pilot-2025',
    name: 'pilot-2025',
    account: 'adorsys-emea',
    spendMtd: null,
    quotaTier: 'growth',
    status: 'suspended',
    statusLabel: 'suspended',
  },
];

export const manageTotals: ManageTotals = {
  shownLabel: 'TOTAL · 12 SHOWN',
  spendMtd: null,
};
