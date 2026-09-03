import React from 'react';

import { Button } from '../../components/button';
import { Card } from '../../components/card';
import { ErrorLine } from '../../components/error-line';
import { InlineStatus } from '../../components/inline-status';
import { SettingsRow } from '../../components/settings-row';
import { SkeletonRow } from '../../components/skeleton-row';
import { META_CLASS, ROW_LABEL_CLASS } from '../../lib/type-roles';
import { useCopyToClipboard } from '../../lib/use-copy-to-clipboard';
import type { BuildInfoCardProps, BuildInfoEntry, BuildInfoFacts } from './types';

/**
 * `/settings/info`'s "Platform" card (lightbridge-authz#573): what build the console is, and what
 * build each backend it talks to is.
 *
 * The screen already answered the first half. The second half had no read endpoint at all until
 * #573, so the row was omitted and an `InlineStatus` named the gap — which is exactly why this
 * section exists: a "the console says X, the server does Y" mismatch had no diagnostic surface,
 * and the one screen whose whole job is "what am I running, what am I talking to, who am I" could
 * only answer two thirds of its own question.
 *
 * ## Shape
 *
 * One `Card`, one labelled group per service, each group a `settings-list` of the facts that
 * service actually reported. Not a table: the row set is genuinely ragged (the console has no
 * `rustc` version; a service outside a container has no image) and a table would have to render a
 * cell for every absent fact, which is the fabrication this screen exists to avoid. The classical
 * settings-list row is the same shape `/settings/accounts/<id>` already uses for "a label and its
 * value", at the same density.
 *
 * ## Honesty, four ways
 *
 * The four `BuildInfoEntryState` variants render as four visibly different things, because a
 * reader diagnosing a skew needs to tell them apart:
 *
 * | state | renders as | means |
 * | --- | --- | --- |
 * | `ready` | the rows | this is what it is running |
 * | `loading` | `SkeletonRow`s at the row geometry | no answer yet |
 * | `unavailable` | `InlineStatus` with its own reason | settled: nothing to show, and why |
 * | `error` | `ErrorLine` + `Retry` | we asked and it failed |
 *
 * An absent FIELD inside a `ready` entry is simply not rendered — never an em dash, never a
 * placeholder. The one deliberate exception is the `unknown` sentinel the backend itself sends
 * when neither git nor the environment could name a value at build time: that is a real answer the
 * backend chose to give, so it is shown verbatim and de-emphasized rather than swallowed.
 *
 * ## Copy
 *
 * Both SHAs are copyable, and the copy writes the FULL value while the row shows the short one.
 * That is the whole point of the affordance: pasting `c3a3b6a` into `git show` works by luck,
 * pasting the full SHA works by construction. Clipboard behaviour is
 * `lib/use-copy-to-clipboard`'s shared best-effort contract — a failed write leaves the button
 * unclaimed rather than claiming a copy that did not happen — and the acknowledgement is scoped to
 * one value by key, so copying `authz-api`'s commit does not light up `authz-idp`'s button too.
 */

/** The literal string `lightbridge-authz`'s `build.rs` bakes in when neither git nor the build
 *  environment could name a value. Recognised here so it can be de-emphasized as the non-answer it
 *  is, rather than sitting in the same weight as a real SHA. */
export const UNKNOWN_BUILD_VALUE = 'unknown';

/** The caption `/settings/info` shows for a service this deployment has not configured at all. */
export const NOT_CONFIGURED_CAPTION = 'Not configured for this deployment.';

function isUnknown(value: string | undefined): boolean {
  return value === UNKNOWN_BUILD_VALUE;
}

/** The commit as it reads on one line: the short SHA, plus `-dirty` when the tree was not clean.
 *  The suffix is not decoration — a `-dirty` build in a deployment is a fact worth noticing. */
function commitLabel(facts: BuildInfoFacts): string | undefined {
  const short = facts.commitShortSha ?? facts.commitSha;
  if (!short) return undefined;
  return facts.dirty && !isUnknown(short) ? `${short}-dirty` : short;
}

interface CopyActionProps {
  /** Written to the clipboard — the FULL value, while the row shows the short form. */
  full: string;
  /** Scopes the "Copied" acknowledgement to this one value. */
  copyKey: string;
  copiedKey: string | null;
  onCopy: (value: string, key: string) => void;
  /** For the button's accessible name — "Copy authz-api commit SHA". */
  what: string;
}

function CopyAction({ full, copyKey, copiedKey, onCopy, what }: CopyActionProps) {
  const copied = copiedKey === copyKey;
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={copied ? `Copied ${what}` : `Copy ${what}`}
      onClick={() => onCopy(full, copyKey)}>
      {copied ? 'Copied' : 'Copy'}
    </Button>
  );
}

function EntryRows({
  entry,
  facts,
  copiedKey,
  onCopy,
}: {
  entry: BuildInfoEntry;
  facts: BuildInfoFacts;
  copiedKey: string | null;
  onCopy: (value: string, key: string) => void;
}) {
  const commit = commitLabel(facts);
  const commitFull = facts.commitSha;
  const imageSha = facts.imageSha;
  const hasImage = Boolean(imageSha || facts.imageTag || facts.imageReference);

  return (
    <div className="settings-list">
      {facts.version ? (
        <SettingsRow label="Version" value={facts.version} valueKind="data" />
      ) : null}

      {commit ? (
        <SettingsRow
          label="Commit"
          description={
            facts.commitDate && !isUnknown(facts.commitDate) ? facts.commitDate : undefined
          }
          value={commit}
          valueKind="data"
          valueMuted={isUnknown(commit)}
          action={
            commitFull && !isUnknown(commitFull) ? (
              <CopyAction
                full={commitFull}
                copyKey={`${entry.id}:commit`}
                copiedKey={copiedKey}
                onCopy={onCopy}
                what={`${entry.label} commit SHA`}
              />
            ) : undefined
          }
        />
      ) : null}

      {/* `Built` is the BINARY's own compile time, and it only earns a row when there is no image:
          for anything the pipeline produced, the image's build time is the deployment-relevant
          fact and sits on the Image row below, minutes away from this one. A locally built binary
          has no image at all, and then this is the only time fact there is. Two near-identical
          timestamps stacked on every service would be density for its own sake. */}
      {!hasImage && facts.builtAt && !isUnknown(facts.builtAt) ? (
        <SettingsRow label="Built" value={facts.builtAt} valueKind="data" />
      ) : null}

      {/* The image half is omitted ENTIRELY when the service is not running from an image built by
          the pipeline (a local `cargo run`, a dev server) — the backend reports null there, which
          is a real answer, and a row reading "Unknown" for a service that legitimately has no
          image would read as a failure rather than as a deployment shape. */}
      {hasImage ? (
        <SettingsRow
          label="Image"
          description={facts.imageBuiltAt}
          value={facts.imageTag ?? imageSha}
          valueKind="data"
          action={
            imageSha ? (
              <CopyAction
                full={imageSha}
                copyKey={`${entry.id}:image`}
                copiedKey={copiedKey}
                onCopy={onCopy}
                what={`${entry.label} image SHA`}
              />
            ) : undefined
          }
        />
      ) : null}

      {/* The full reference gets its OWN row rather than replacing the tag above, because they
          answer two different questions: "which build is this" (the tag — short, and the thing a
          Tempo `service.version` is grouped by) and "what do I type to pull it" (the reference).
          It is the one value here long enough that selecting it by hand is the annoying part, so
          it carries the Copy affordance; the tag is rendered whole and needs none. */}
      {facts.imageReference ? (
        <SettingsRow
          label="Reference"
          value={facts.imageReference}
          valueKind="data"
          action={
            <CopyAction
              full={facts.imageReference}
              copyKey={`${entry.id}:image-reference`}
              copiedKey={copiedKey}
              onCopy={onCopy}
              what={`${entry.label} image reference`}
            />
          }
        />
      ) : null}

      {facts.toolchain && !isUnknown(facts.toolchain) ? (
        <SettingsRow label="Toolchain" value={facts.toolchain} valueKind="data" />
      ) : null}
    </div>
  );
}

export function BuildInfoCard({
  title = 'Platform',
  entries,
  caption,
  className,
}: BuildInfoCardProps) {
  const { copiedKey, copy } = useCopyToClipboard();
  const handleCopy = (value: string, key: string) => {
    void copy(value, key);
  };

  return (
    <Card title={title} className={className}>
      <div className="flex flex-col gap-6">
        {entries.map((entry) => (
          <div key={entry.id} className="flex flex-col gap-2">
            {/* Label and its caption on ONE line, not stacked: the caption says how the answer was
                obtained ("getBuildInfo over /api"), which is a qualifier on the name rather than a
                second fact, and stacking it would give every group a two-line header for a
                five-group card. */}
            <span className={ROW_LABEL_CLASS}>
              {entry.label}
              {entry.description ? (
                <span className={META_CLASS}> · {entry.description}</span>
              ) : null}
            </span>

            {entry.state.status === 'ready' ? (
              <EntryRows
                entry={entry}
                facts={entry.state.facts}
                copiedKey={copiedKey}
                onCopy={handleCopy}
              />
            ) : null}

            {/* Loading keeps the row geometry rather than collapsing the group — a frame that
                disappears and comes back reads as broken; an empty frame reads as "still asking". */}
            {entry.state.status === 'loading' ? (
              <div className="settings-list">
                <SkeletonRow columnCount={2} />
                <SkeletonRow columnCount={2} />
              </div>
            ) : null}

            {entry.state.status === 'unavailable' ? (
              <InlineStatus>{entry.state.caption}</InlineStatus>
            ) : null}

            {entry.state.status === 'error' ? (
              <ErrorLine message={entry.state.errorMessage} onRetry={entry.state.onRetry} />
            ) : null}
          </div>
        ))}
      </div>

      {caption ? <InlineStatus className="mt-4">{caption}</InlineStatus> : null}
    </Card>
  );
}
