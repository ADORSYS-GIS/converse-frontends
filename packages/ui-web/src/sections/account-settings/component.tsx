import React from 'react';

import { Button } from '../../components/button';
import { Card } from '../../components/card';
import { EmptyState } from '../../components/empty-state';
import { ErrorLine } from '../../components/error-line';
import { InlineStatus } from '../../components/inline-status';
import { SettingsRow } from '../../components/settings-row';
import { NO_QUOTA_TIER_LABEL } from '../../lib/quota-tier';
import type { AccountSettingsProps } from './types';

/** What the console renders in place of a name that was never set. */
export const UNNAMED_ACCOUNT_LABEL = 'Unnamed account';

/** Why the unnamed state gets its own prompt rather than passing silently: an account with
 *  `name === null` renders as its raw JWT subject everywhere else in the console, which is the
 *  exact defect `Account.name` was added to fix. */
export const UNNAMED_ACCOUNT_HINT =
  'This account has never been named, so it shows as its id across the console.';

export const NO_ACCOUNT_MESSAGE =
  'You do not have an account yet. Projects, API keys and budgets all hang off one.';

/**
 * The landmark name, deliberately NOT `Card`'s own "Account" title.
 *
 * The Card's title is the account AND its settings; a screen-reader landmark list needs a more
 * specific name than "Account" repeated across a page (`ProjectSettings`'s own project blocks
 * each carry a `Status` row too), so the outer region is named "Account settings" instead of
 * duplicating the visible heading.
 */
export const ACCOUNT_SETTINGS_REGION_LABEL = 'Account settings';

// Contract: phase 9 (owner: "The settings pages do NOT look like a settings page. Why not do the
// classical list-like setting page?") — ONE `Card` holding a classical settings LIST
// (`settings-list`/`SettingsRow`, macOS/Stripe/Linear pattern), not a definition grid. The Card
// carries no title of its own: the tab above it already says "Account" (`SettingsSubNav`), so a
// second "Account" heading directly under it would repeat information rather than add it.
//
// Folds what used to be the separate `AccountPanel` section into this one: that panel answered
// "what is this account called, and how do I change that" with its own header-less layout; this
// section now owns that whole surface directly, so the id renders exactly once (Copy sits beside
// it in its own row).
//
// The unnamed account is NOT a full-card empty-state placard any more (superseded — the row list
// below IS the card's content in every state that has an account at all): its Account name row
// reads `Not set` at `subtle` with the `Name this account` action in the row's own trailing edge,
// while Account id/Status/Default quota tier render as ordinary rows beside it — an account is
// still an account before it has a name. Only "no account at all" — nothing to build a row list
// out of — stays a genuine first-run `EmptyState`.
export function AccountSettings({ panel, details, onCopyId, className }: AccountSettingsProps) {
  const {
    account,
    loading,
    error,
    onRetry,
    onCreate,
    createDisabled = false,
    createReason,
    onRename,
  } = panel;
  const named = account !== null && account.name !== null;

  let body: React.ReactNode;

  if (error) {
    body = <ErrorLine message={error} onRetry={onRetry} />;
  } else if (loading) {
    body = <InlineStatus>Loading your account…</InlineStatus>;
  } else if (account === null) {
    body = (
      <EmptyState
        headline="No account yet"
        explainer={createReason ? `${NO_ACCOUNT_MESSAGE} ${createReason}` : NO_ACCOUNT_MESSAGE}
        action={
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onCreate}
            disabled={createDisabled}>
            Create account
          </Button>
        }
      />
    );
  } else {
    body = (
      <div className="settings-list">
        <SettingsRow
          label="Account name"
          value={named ? account.name : 'Not set'}
          valueMuted={!named}
          action={
            <Button type="button" variant="secondary" size="sm" onClick={onRename}>
              {named ? 'Rename' : 'Name this account'}
            </Button>
          }
        />

        {/* Omitted entirely rather than dashed out when there is nothing truthful to show —
            `panel` above has already said whether this is loading or a failed fetch. */}
        {details ? (
          <>
            <SettingsRow
              label="Account id"
              value={details.id}
              valueKind="data"
              action={
                onCopyId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Copy account id"
                    onClick={() => onCopyId(details.id)}>
                    Copy
                  </Button>
                ) : undefined
              }
            />
            {/* Text, never a pill (console-ui skill § States). */}
            <SettingsRow label="Status" value={details.status} />
            <SettingsRow
              label="Default quota tier"
              value={details.defaultQuotaTier ?? NO_QUOTA_TIER_LABEL}
            />
          </>
        ) : null}
      </div>
    );
  }

  return (
    <section aria-label={ACCOUNT_SETTINGS_REGION_LABEL} className={className}>
      <Card>{body}</Card>
    </section>
  );
}
