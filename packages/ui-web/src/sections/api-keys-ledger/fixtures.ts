// api-keys.svg — the 11-row ledger shown in the mockup (mixed statuses incl. one expiring soon).
// Moved here verbatim from the deleted `pages/api-keys/fixtures.ts`.

import type { ApiKeyRow, ApiKeysSecretReveal } from './types';

export const apiKeysFixture: ApiKeyRow[] = [
  { id: 'ci-deploy', name: 'ci-deploy', prefix: 'lb_live_a91f…', status: 'active', statusLabel: 'active', created: '2026-01-04', lastUsed: '2 min ago', expires: '2026-09-04' },
  { id: 'gateway-edge', name: 'gateway-edge', prefix: 'lb_live_77c2…', status: 'active', statusLabel: 'active', created: '2025-11-19', lastUsed: '41 min ago', expires: 'no expiry' },
  { id: 'batch-eval', name: 'batch-eval', prefix: 'lb_live_0d5e…', status: 'expiring', statusLabel: 'expiring', created: '2025-08-02', lastUsed: '6 h ago', expires: '2026-03-02' },
  { id: 'legacy-import', name: 'legacy-import', prefix: 'lb_live_3b8a…', status: 'revoked', statusLabel: 'revoked', created: '2025-05-30', lastUsed: '2025-12-11', expires: '—' },
  { id: 'analytics-ro', name: 'analytics-ro', prefix: 'lb_live_c4f1…', status: 'active', statusLabel: 'active', created: '2026-02-02', lastUsed: '3 d ago', expires: '2026-08-02' },
  { id: 'sandbox', name: 'sandbox', prefix: 'lb_live_9e7d…', status: 'active', statusLabel: 'active', created: '2026-02-14', lastUsed: 'never used', expires: '2026-05-14' },
  { id: 'eval-harness', name: 'eval-harness', prefix: 'lb_live_5a2c…', status: 'active', statusLabel: 'active', created: '2026-02-18', lastUsed: '12 h ago', expires: '2026-08-18' },
  { id: 'webhook-relay', name: 'webhook-relay', prefix: 'lb_live_e610…', status: 'active', statusLabel: 'active', created: '2025-09-08', lastUsed: '4 min ago', expires: 'no expiry' },
  { id: 'staging-sync', name: 'staging-sync', prefix: 'lb_live_2f9b…', status: 'active', statusLabel: 'active', created: '2025-12-22', lastUsed: '1 d ago', expires: '2026-06-22' },
  { id: 'old-ci', name: 'old-ci', prefix: 'lb_live_8c34…', status: 'revoked', statusLabel: 'revoked', created: '2025-03-14', lastUsed: '2025-10-02', expires: '—' },
  { id: 'partner-readonly', name: 'partner-readonly', prefix: 'lb_live_b7e5…', status: 'active', statusLabel: 'active', created: '2026-01-27', lastUsed: '9 d ago', expires: '2027-01-27' },
];

// Counts only. The expiring key is `ApiKeysHygieneNotes`' line, not this one — carrying it in
// both put "1 expires in 6 days" on screen twice, four lines apart (owner screenshot 2026-08-29).
export const apiKeysStatusSummary = '23 active · 4 revoked';

export const apiKeysNewSecret: ApiKeysSecretReveal = {
  heading: 'New key created — shown once',
  description:
    'Copy it now. Lightbridge stores only the prefix; this value can never be retrieved again.',
  secret: 'sk-lb-Xq7T4mA9vR2nK8sE1wYb6tZ0pL5cJ3dF',
};
