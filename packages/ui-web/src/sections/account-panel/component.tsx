import React from 'react';

import { cn } from '../../cn';
import { Button } from '../../components/button';
import { ErrorLine } from '../../components/error-line';
import { fieldLabelClassName } from '../../components/field/field-classes';
import { InlineStatus } from '../../components/inline-status';
import type { AccountPanelProps } from './types';

/** What the console renders in place of a name that was never set. Exported so the app can reuse
 *  the exact same string in its account picker rather than inventing a second placeholder. */
export const UNNAMED_ACCOUNT_LABEL = 'Unnamed account';

/**
 * Why the unnamed state gets a line of its own rather than passing silently: an account with
 * `name === null` renders as its raw JWT subject everywhere else in the console, which is the
 * exact defect `Account.name` was added to fix. Saying so once, next to the control that fixes it,
 * is the difference between a state and a dead end.
 */
export const UNNAMED_ACCOUNT_HINT =
  'This account has never been named, so it shows as its id across the console.';

export const NO_ACCOUNT_MESSAGE =
  'You do not have an account yet. Projects, API keys and budgets all hang off one.';

// Contract: docs/design/console-redesign/README.md §4 (states) / §5.3 (manage-projects.svg) — the
// centre column's floor, no card. Every non-populated state here is an inline mono status line
// with its action on the same line, never a centred placard: this panel sits above a live ledger,
// so it never owns the whole screen (console-ui skill §states).
export function AccountPanel({
  account,
  loading,
  error,
  onRetry,
  onCreate,
  createDisabled = false,
  createReason,
  onRename,
  className,
}: AccountPanelProps) {
  const named = account !== null && account.name !== null;

  return (
    <section aria-label="Account" className={cn('flex flex-col gap-2', className)}>
      <h2 className={fieldLabelClassName}>Account</h2>

      {error ? (
        <ErrorLine message={error} onRetry={onRetry} />
      ) : loading ? (
        <InlineStatus>Loading your account…</InlineStatus>
      ) : account === null ? (
        <>
          <InlineStatus
            action={
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={onCreate}
                disabled={createDisabled}>
                Create account
              </Button>
            }>
            {NO_ACCOUNT_MESSAGE}
          </InlineStatus>
          {createReason ? (
            <p className="text-subtle font-sans text-[11px] leading-[1.45]">{createReason}</p>
          ) : null}
        </>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              {/* `text-subtle` rather than `text-ink` for the placeholder is the whole visual
                  distinction: a real name reads as a value, an absent one reads as chrome. */}
              <span
                data-named={named}
                className={cn('font-mono text-sm', named ? 'text-ink' : 'text-subtle')}>
                {named ? account.name : UNNAMED_ACCOUNT_LABEL}
              </span>
              {/* The id stays visible in BOTH states — it is the only way to address an account,
                  and a name never replaces it. */}
              <span className="text-subtle font-mono text-[11px]">{account.id}</span>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={onRename}>
              {named ? 'Rename' : 'Name this account'}
            </Button>
          </div>
          {named ? null : <InlineStatus>{UNNAMED_ACCOUNT_HINT}</InlineStatus>}
        </>
      )}
    </section>
  );
}
