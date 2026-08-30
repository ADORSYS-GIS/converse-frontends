import React from 'react';

import { Button } from '../../components/button';
import { Card } from '../../components/card';
import { EmptyState } from '../../components/empty-state';
import { ErrorLine } from '../../components/error-line';
import { InlineStatus } from '../../components/inline-status';
import { INLINE_ROW_CLASS } from '../../lib/inline-row';
import { NO_QUOTA_TIER_LABEL } from '../../lib/quota-tier';
import { BODY_CLASS, DATA_CLASS, LABEL_CLASS } from '../../lib/type-roles';
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

const GRID_CLASS = 'grid grid-cols-1 gap-5 md:grid-cols-2';
const ROW_CLASS = 'flex flex-col gap-1';

// Contract: console visual revamp (2026-08, admin/settings phase) — ONE `Card`, a definition
// grid with labels ABOVE values (2 columns at `md`, 20px row rhythm), `Rename` as a size-sm
// secondary action in the Card's own header. Sits FIRST on `/settings/account`, because an
// account is upstream of everything under it.
//
// Folds what used to be the separate `AccountPanel` section into this one: that panel answered
// "what is this account called, and how do I change that" with its own header-less layout (name
// beside a Rename button, id repeated underneath); this section now owns that whole surface
// directly, so the id renders exactly once (Copy sits beside it) and Rename lives in the Card
// head next to the title rather than floating beside the name.
//
// The never-named and no-account states are NOT rows with an em dash — both are a naming PROMPT,
// restyled as an `EmptyState` block (headline + explainer + the one CTA that gets out of the
// state) rather than the old inline status line, the same way `ReviewQueue`'s empty collection
// replaces its table outright. The header carries no `Rename` action in either state: the CTA
// that names the account already lives in the body, and offering it twice would be noise.
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
  let headerActions: React.ReactNode = null;

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
  } else if (!named) {
    body = (
      <EmptyState
        headline={UNNAMED_ACCOUNT_LABEL}
        explainer={UNNAMED_ACCOUNT_HINT}
        action={
          <Button type="button" variant="secondary" size="sm" onClick={onRename}>
            Name this account
          </Button>
        }
      />
    );
  } else {
    headerActions = (
      <Button type="button" variant="secondary" size="sm" onClick={onRename}>
        Rename
      </Button>
    );
    body = (
      <dl className={GRID_CLASS}>
        <div className={ROW_CLASS}>
          <dt className={LABEL_CLASS}>Name</dt>
          <dd className={BODY_CLASS}>{account.name}</dd>
        </div>

        {/* Omitted entirely rather than dashed out when there is nothing truthful to show —
            `panel` above has already said whether this is loading or a failed fetch. */}
        {details ? (
          <>
            <div className={ROW_CLASS}>
              <dt className={LABEL_CLASS}>Account id</dt>
              <dd className={INLINE_ROW_CLASS}>
                <span className={DATA_CLASS}>{details.id}</span>
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

            <div className={ROW_CLASS}>
              <dt className={LABEL_CLASS}>Status</dt>
              {/* Text, never a pill (console-ui skill § States). */}
              <dd className={BODY_CLASS}>{details.status}</dd>
            </div>

            <div className={ROW_CLASS}>
              <dt className={LABEL_CLASS}>Default quota tier</dt>
              <dd className={BODY_CLASS}>{details.defaultQuotaTier ?? NO_QUOTA_TIER_LABEL}</dd>
            </div>
          </>
        ) : null}
      </dl>
    );
  }

  return (
    <section aria-label={ACCOUNT_SETTINGS_REGION_LABEL} className={className}>
      <Card title="Account" actions={headerActions}>
        {body}
      </Card>
    </section>
  );
}
