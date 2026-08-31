'use client';

import { Card } from '@lightbridge/ui-web/src/components/card';
import { ErrorLine } from '@lightbridge/ui-web/src/components/error-line';
import { InlineStatus } from '@lightbridge/ui-web/src/components/inline-status';
import { SkeletonMetric } from '@lightbridge/ui-web/src/components/skeleton-metric';
import { PageHeader } from '@lightbridge/ui-web/src/sections/page-header';
import { PolicySimulator } from '@lightbridge/ui-web/src/sections/policy-simulator';

import { useRefillOptionsScreen } from './use-refill-options-screen';

/**
 * `/settings/refill-options` — "Refill options policies" (IA v3 phase 3 — the nav row goes live).
 *
 * Two cards:
 *
 *  1. **Your current ladder** — a read-only echo of `useBudgetRefillLadder()` (shared with
 *     `/settings/accounts/<id>/request-refill`, never forked): the amounts the caller's own home account could
 *     request right now. No submit control here — that is the refill page's whole job.
 *  2. **Try a policy** — `PolicySimulator`, over `procedure.simulateBudgetPolicy`. A scratch pad,
 *     not a view onto any account's actual active policy.
 *
 * What this page deliberately does NOT ship — the policy-STATUS block (`getBudgetPolicyStatus`
 * needs a `policySetId` with no procedure to discover one) and the stored-rule-data block (no
 * read API for rule content at all) — is named inline, once, via `REFILL_OPTIONS_DISABLED_REASON`
 * (`client/console-chrome.tsx`), rather than rendered as an empty or fabricated block.
 */
export function RefillOptionsCentre() {
  const screen = useRefillOptionsScreen();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Refill options policies" subtitle={screen.scopeLabel} />

      <Card title="Your current ladder">
        {screen.ladder.status === 'loading' ? (
          <SkeletonMetric width={160} />
        ) : screen.ladder.status === 'error' ? (
          <ErrorLine
            message={screen.ladder.errorMessage ?? 'Could not load the refill policy.'}
            onRetry={screen.ladder.onRetry}
          />
        ) : screen.ladder.status === 'unavailable' || screen.ladder.status === 'empty' ? (
          <InlineStatus>{screen.ladder.caption}</InlineStatus>
        ) : (
          <p className="text-ink font-mono text-[13px]">{screen.ladder.amounts.join(' · ')}</p>
        )}
      </Card>

      <Card>
        <PolicySimulator {...screen.simulator} />
      </Card>

      <InlineStatus>{screen.omittedNote}</InlineStatus>
    </div>
  );
}
