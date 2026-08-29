import React from 'react';

import { cn } from '../../cn';
import { Button } from '../../components/button';
import { DETAIL_LIST_CLASS, DETAIL_ROW_CLASS, DETAIL_SECTION_CLASS } from '../../lib/detail-row';
import { INLINE_ROW_CLASS } from '../../lib/inline-row';
import { NO_QUOTA_TIER_LABEL } from '../../lib/quota-tier';
import { LABEL_CLASS, ROW_CLASS } from '../../lib/type-roles';
import { AccountPanel } from '../account-panel';
import type { AccountSettingsProps } from './types';

/** Heading for whichever host mounts this section — see `MANAGE_SELECTION_RAIL_LABEL`'s note. */
export const ACCOUNT_SETTINGS_LABEL = 'Account';

/**
 * The landmark name, deliberately NOT `ACCOUNT_SETTINGS_LABEL`.
 *
 * `AccountPanel` already labels its own region "Account", and this section wraps it — two nested
 * regions with the same accessible name are indistinguishable to a screen reader's landmark list
 * and ambiguous to `getByRole('region', { name })`. The outer one is the account AND its settings;
 * the inner one is the name control alone, which is exactly what the two names now say.
 */
export const ACCOUNT_SETTINGS_REGION_LABEL = 'Account settings';

// Contract: docs/design/console-redesign/README.md §4 (states) — the centre column's floor, no
// card, tonal separation only. Sits FIRST on `/settings`, because an account is upstream of
// everything under it: with no account there are no projects, no keys and no budgets, so the
// screen's own first block is the one that can create one.
//
// Why this section exists at all rather than `AccountPanel` alone: the panel answers "what is
// this account called, and how do I change that". It deliberately does not answer "what is this
// account" — its id (copyable, because it is what a support thread asks for), its lifecycle
// state, and the governance tier its default project draws on. Those three are `@readonly` in
// `authz.cstack` with no generic update verb behind them at all (`model.Account.update` was
// removed in lightbridge-authz#398 once every column became `@readonly`), so they are rows and
// not controls — that is the contract, not a simplification.
export function AccountSettings({ panel, details, onCopyId, className }: AccountSettingsProps) {
  return (
    <section
      aria-label={ACCOUNT_SETTINGS_REGION_LABEL}
      className={cn(DETAIL_SECTION_CLASS, className)}>
      <AccountPanel {...panel} />

      {/* Omitted entirely rather than dashed out when there is nothing truthful to show: the
          panel above has already said whether this is "no account", "still loading" or "the
          fetch failed", and a row reading "Status —" would quietly claim a fourth thing. */}
      {details ? (
        <dl className={DETAIL_LIST_CLASS}>
          <div className={DETAIL_ROW_CLASS}>
            <dt className={LABEL_CLASS}>Account id</dt>
            <dd className={INLINE_ROW_CLASS}>
              <span className={ROW_CLASS}>{details.id}</span>
              {onCopyId ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Copy account id"
                  onClick={() => onCopyId(details.id)}>
                  Copy
                </Button>
              ) : null}
            </dd>
          </div>

          <div className={DETAIL_ROW_CLASS}>
            <dt className={LABEL_CLASS}>Status</dt>
            {/* Text, never a pill (console-ui skill § States). */}
            <dd className={ROW_CLASS}>{details.status}</dd>
          </div>

          <div className={DETAIL_ROW_CLASS}>
            <dt className={LABEL_CLASS}>Default quota tier</dt>
            <dd className={ROW_CLASS}>{details.defaultQuotaTier ?? NO_QUOTA_TIER_LABEL}</dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}
