'use client';

import { ApiKeysLedger } from '@lightbridge/ui-web/src/sections/api-keys-ledger';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';

const noop = () => {};

/**
 * `/api-keys` centre loading skeleton — see `(console)/loading.tsx`'s docstring for why this file
 * exists at all (no Suspense boundary previously existed anywhere in the `(console)` group).
 *
 * `ApiKeysLedger` already renders `LedgerTable`'s row-skeleton geometry when `loading` is set —
 * this is the same contract `ApiKeysCentre` drives from `screen.loading`, just with no live data
 * to feed it yet. The required callback props are never invoked here (nothing is interactive
 * before hydration replaces this tree), so they are plain no-ops.
 */
export default function ApiKeysLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="API keys" subtitle="loading scope…" />

      <ApiKeysLedger
        keys={[]}
        loading
        loadingRowCount={8}
        onDismissSecret={noop}
        onRotate={noop}
        onRequestRevoke={noop}
        onConfirmRevoke={noop}
        onCancelRevoke={noop}
        isAdmin={false}
        onRequestDelete={noop}
        onConfirmDelete={noop}
        onCancelDelete={noop}
      />
    </div>
  );
}
