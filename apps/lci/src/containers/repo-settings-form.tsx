'use client';

import { Button } from '@lightbridge/ui-web/src/components/button';
import { ErrorLine } from '@lightbridge/ui-web/src/components/error-line';
import { Field } from '@lightbridge/ui-web/src/components/field';
import { SelectField } from '@lightbridge/ui-web/src/components/select-field';
import { SettingsRow } from '@lightbridge/ui-web/src/components/settings-row';
import { StatusText } from '@lightbridge/ui-web/src/components/status-text';
import { Toggle } from '@lightbridge/ui-web/src/components/toggle';
import { useState, useTransition } from 'react';

import type { RepoSettingsPatch, ResolvedSettings } from '../lib/server/admin';
import { clearRepoSetting, setRepoSetting } from './repository-settings-actions';

/** A setting's provenance as `StatusText` — `db` (an explicit admin override) is the one state
 *  worth a reader's attention; `file`/`default` are both "nothing overridden," so both read
 *  `muted`. */
function provenanceLabel(source: 'default' | 'file' | 'db'): string {
  switch (source) {
    case 'db':
      return 'Admin override';
    case 'file':
      return 'Repo file';
    default:
      return 'Default';
  }
}

function Provenance({ source }: { source: 'default' | 'file' | 'db' }) {
  return (
    <StatusText tone={source === 'db' ? 'attention' : 'muted'}>
      {provenanceLabel(source)}
    </StatusText>
  );
}

/**
 * The repository's review-behaviour settings: check-run reporting, review triggers, push-storm
 * handling, and finding-suppression scope, each editable with a reset back to its default or
 * config-file value. One component owns all six rows' local state and calls the corresponding
 * Server Action directly via `useTransition` on change, since the controls here are fully
 * controlled (no native `name`/`FormData` participation to bind a `<form>` to). Each row puts its
 * control in `SettingsRow.value` alongside its provenance, and the reset affordance in
 * `SettingsRow.action`.
 */
export function RepoSettingsForm({
  id,
  settings,
  canConfigure,
}: {
  id: number;
  settings: ResolvedSettings;
  canConfigure: boolean;
}) {
  const [state, setState] = useState(settings);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function apply(patch: RepoSettingsPatch, optimistic: Partial<ResolvedSettings>) {
    setError(null);
    setState((s) => ({ ...s, ...optimistic }));
    startTransition(async () => {
      const result = await setRepoSetting(id, patch);
      if (!result.ok) setError(result.error);
    });
  }

  function reset(field: keyof RepoSettingsPatch) {
    setError(null);
    startTransition(async () => {
      const result = await clearRepoSetting(id, field);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? <ErrorLine message={error} /> : null}

      <SettingsRow
        label="Check-run reporting"
        description="Post a check/status on the pull request for each review run."
        value={
          <div className="flex items-center gap-3">
            <Provenance source={state.check_run_reporting.source} />
            <Toggle
              aria-label="Check-run reporting"
              checked={state.check_run_reporting.value}
              disabled={!canConfigure || pending}
              onCheckedChange={(checked) =>
                apply(
                  { check_run_reporting: checked },
                  { check_run_reporting: { value: checked, source: 'db' } }
                )
              }
            />
          </div>
        }
        action={
          canConfigure && state.check_run_reporting.source === 'db' ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => reset('check_run_reporting')}>
              Reset
            </Button>
          ) : undefined
        }
      />

      <SettingsRow
        label="Review on PR open"
        description="Automatically review when a pull request is opened."
        value={
          <div className="flex items-center gap-3">
            <Provenance source={state.review_on_pr_open.source} />
            <Toggle
              aria-label="Review on PR open"
              checked={state.review_on_pr_open.value}
              disabled={!canConfigure || pending}
              onCheckedChange={(checked) =>
                apply(
                  { review_on_pr_open: checked },
                  { review_on_pr_open: { value: checked, source: 'db' } }
                )
              }
            />
          </div>
        }
        action={
          canConfigure && state.review_on_pr_open.source === 'db' ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => reset('review_on_pr_open')}>
              Reset
            </Button>
          ) : undefined
        }
      />

      <SettingsRow
        label="Review on push"
        description="Re-review new commits pushed to an already-open pull request. Off by default — this multiplies review runs by push frequency."
        value={
          <div className="flex items-center gap-3">
            <Provenance source={state.review_on_push.source} />
            <Toggle
              aria-label="Review on push"
              checked={state.review_on_push.value}
              disabled={!canConfigure || pending}
              onCheckedChange={(checked) =>
                apply(
                  { review_on_push: checked },
                  { review_on_push: { value: checked, source: 'db' } }
                )
              }
            />
          </div>
        }
        action={
          canConfigure && state.review_on_push.source === 'db' ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => reset('review_on_push')}>
              Reset
            </Button>
          ) : undefined
        }
      />

      <SettingsRow
        label="Push-storm strategy"
        description="How rapid successive pushes to an open PR are handled."
        value={
          <div className="flex items-center gap-3">
            <Provenance source={state.push_strategy.source} />
            <SelectField
              label="Push-storm strategy"
              hideLabel
              value={state.push_strategy.value}
              disabled={!canConfigure || pending}
              onChange={(value) =>
                apply(
                  { push_strategy: value as RepoSettingsPatch['push_strategy'] },
                  {
                    push_strategy: {
                      value: value as ResolvedSettings['push_strategy']['value'],
                      source: 'db',
                    },
                  }
                )
              }
              options={[
                { value: 'supersede', label: 'Supersede — cancel the older run' },
                { value: 'debounce', label: 'Debounce — wait for a quiet period' },
                { value: 'every', label: 'Every push' },
              ]}
            />
          </div>
        }
        action={
          canConfigure && state.push_strategy.source === 'db' ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => reset('push_strategy')}>
              Reset
            </Button>
          ) : undefined
        }
      />

      {state.push_strategy.value === 'debounce' ? (
        <SettingsRow
          label="Debounce window"
          description="Seconds to wait after a push before reviewing (10–900)."
          value={
            <div className="flex items-center gap-3">
              <Provenance source={state.push_debounce.source} />
              <Field
                label="Debounce window"
                hideLabel
                type="number"
                min={10}
                max={900}
                defaultValue={state.push_debounce.value.secs}
                disabled={!canConfigure || pending}
                containerClassName="w-24"
                onBlur={(e) => {
                  const secs = Number(e.target.value);
                  if (!Number.isInteger(secs)) return;
                  apply(
                    { push_debounce_seconds: secs },
                    { push_debounce: { value: { secs, nanos: 0 }, source: 'db' } }
                  );
                }}
              />
            </div>
          }
          action={
            canConfigure && state.push_debounce.source === 'db' ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => reset('push_debounce_seconds')}>
                Reset
              </Button>
            ) : undefined
          }
        />
      ) : null}

      <SettingsRow
        label="Finding suppression scope"
        description="Suppress an already-reported finding across the whole PR, or only within the same commit."
        value={
          <div className="flex items-center gap-3">
            <Provenance source={state.dedup_scope.source} />
            <SelectField
              label="Finding suppression scope"
              hideLabel
              value={state.dedup_scope.value}
              disabled={!canConfigure || pending}
              onChange={(value) =>
                apply(
                  { dedup_scope: value as RepoSettingsPatch['dedup_scope'] },
                  {
                    dedup_scope: {
                      value: value as ResolvedSettings['dedup_scope']['value'],
                      source: 'db',
                    },
                  }
                )
              }
              options={[
                { value: 'pr', label: 'Whole PR' },
                { value: 'commit', label: 'Same commit only' },
              ]}
            />
          </div>
        }
        action={
          canConfigure && state.dedup_scope.source === 'db' ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => reset('dedup_scope')}>
              Reset
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}
