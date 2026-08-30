import React from 'react';

import { Button } from '../../components/button';
import { ErrorLine } from '../../components/error-line';
import { InlineStatus } from '../../components/inline-status';
import { SettingsRow } from '../../components/settings-row';
import { NO_QUOTA_TIER_LABEL } from '../../lib/quota-tier';
import { ZoneHeading } from '../../lib/zone-heading';
import type { InspectorSettingsPanelProps } from './types';

/**
 * The inspector rail's STANDING content on `/` alone (console-ui rail brief, 2026-08-30 owner
 * round: "I liked it when the right rail was there... We could display settings there"; final
 * resolution on the rail's content policy, same day: "the right rail was empty depending on the
 * situation. Solution: hide it if empty" — `/projects`/`/admin` show the rail ONLY on a
 * selection, never this panel; `/` shows THIS panel always, since account identity has a real job
 * beside the Budget card there; every other route shows no rail at all).
 *
 * Deliberately lean — the standing actions ("+ New account", "+ New project", "Request refill")
 * that a full settings page would spread across a header and a card both collapse into ordinary
 * rows here, because the rail has no header of its own to put them in.
 *
 * IA v3 phase 2 ("the settings area") retired `AccountSettings`/`/settings/account` — this panel
 * is now the one standing place the scoped account's identity, id AND status live, so it carries
 * a `Status` row (text, never a pill) alongside `Account name`/`Account id`/`Quota tier`, where
 * it used to omit one deliberately as "AccountSettings' job."
 */
export function InspectorSettingsPanel({
  account,
  loading,
  error,
  onRetry,
  onRename,
  onCopyId,
  onNewAccount,
  onNewProject,
  onRequestRefill,
  className,
}: InspectorSettingsPanelProps) {
  let body: React.ReactNode;

  if (error) {
    body = <ErrorLine message={error} onRetry={onRetry} />;
  } else if (loading) {
    body = <InlineStatus>Loading your account…</InlineStatus>;
  } else if (account === null) {
    body = <InlineStatus>You do not have an account yet.</InlineStatus>;
  } else {
    body = (
      <div className="settings-list">
        <SettingsRow
          label="Account name"
          value={account.named ? account.label : 'Not set'}
          valueMuted={!account.named}
          action={
            <Button type="button" variant="secondary" size="sm" onClick={onRename}>
              {account.named ? 'Rename' : 'Name this account'}
            </Button>
          }
        />
        <SettingsRow
          label="Account id"
          value={account.id}
          valueKind="data"
          action={
            onCopyId ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Copy account id"
                onClick={() => onCopyId(account.id)}>
                Copy
              </Button>
            ) : undefined
          }
        />
        {/* Text, never a pill (console-ui skill § States) — same treatment `AccountSettings`'
            own Status row used to give it. */}
        <SettingsRow label="Status" value={account.status} />
        <SettingsRow label="Quota tier" value={account.quotaTier ?? NO_QUOTA_TIER_LABEL} />
      </div>
    );
  }

  return (
    <div className={className}>
      <ZoneHeading label={account?.label ?? 'Account'} />
      <div className="mt-4">{body}</div>
      <div className="settings-list mt-4">
        <SettingsRow
          label="Add another account"
          description="Create and switch to a new account"
          action={
            <Button type="button" variant="secondary" size="sm" onClick={onNewAccount}>
              + New account
            </Button>
          }
        />
        <SettingsRow
          label="Add a project"
          description="Start issuing API keys and tracking spend"
          action={
            <Button type="button" variant="secondary" size="sm" onClick={onNewProject}>
              + New project
            </Button>
          }
        />
        <SettingsRow
          label="Request refill"
          description="Ask an operator to top up this account's budget"
          action={
            <Button type="button" variant="secondary" size="sm" onClick={onRequestRefill}>
              Request refill…
            </Button>
          }
        />
      </div>
    </div>
  );
}
