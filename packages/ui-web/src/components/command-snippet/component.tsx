import React from 'react';

import { cn } from '../../cn';
import { DATA_CLASS, LABEL_CLASS } from '../../lib/type-roles';
import { useCopyToClipboard } from '../../lib/use-copy-to-clipboard';
import { Button } from '../button';
import type { CommandSnippetProps } from './types';

// A read-only shell command with a copy button (e.g. the `kubectl logs` one-liner for streaming a
// run's logs). Paint is the named `command-snippet` part in `theme.css` (same bordered-strip
// family as `SecretReveal`'s `secret-strip`); the command itself is DATA (`DATA_CLASS`), never
// prose. Copy-to-clipboard is `lib/use-copy-to-clipboard`'s
// best-effort/no-throw contract — a failed write leaves the button unclaimed rather than reporting
// a copy that didn't happen. That hook is the single implementation this, `SecretReveal` and
// `CreateApiKeyDialog` all share.
export function CommandSnippet({ command, label, className }: CommandSnippetProps) {
  const { copiedKey, copy } = useCopyToClipboard();
  const copied = copiedKey === command;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label ? <span className={LABEL_CLASS}>{label}</span> : null}
      <div className="command-snippet">
        {/* `tabIndex={0}` because `theme.css`'s `command-snippet` gives this `code` its own
            `overflow-x: auto`: a command longer than the strip scrolls, and axe
            `scrollable-region-focusable` (WCAG 2.1.1) fails a scroll container a keyboard user
            cannot enter. No `role` — a landmark here would be noise, and several snippets on one
            page would all claim the same one. */}
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
        <code className={DATA_CLASS} tabIndex={0}>
          {command}
        </code>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => void copy(command)}
          aria-label={copied ? 'Copied' : 'Copy command'}>
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </div>
  );
}
