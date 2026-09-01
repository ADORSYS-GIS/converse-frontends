import React, { useEffect, useRef, useState } from 'react';

import { cn } from '../../cn';
import { DATA_CLASS, LABEL_CLASS } from '../../lib/type-roles';
import { Button } from '../button';
import type { CommandSnippetProps } from './types';

// A read-only shell command with a copy button (e.g. the `kubectl logs` one-liner for streaming a
// run's logs). Paint is the named `command-snippet` part in `theme.css` (same bordered-strip
// family as `SecretReveal`'s `secret-strip`); the command itself is DATA (`DATA_CLASS`), never
// prose. Copy-to-clipboard mirrors `SecretReveal`'s best-effort/no-throw contract — a failed write
// leaves the button unclaimed rather than reporting a copy that didn't happen.
export function CommandSnippet({ command, label, className }: CommandSnippetProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  async function handleCopy() {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(command);
      } else {
        return;
      }
    } catch {
      return;
    }
    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label ? <span className={LABEL_CLASS}>{label}</span> : null}
      <div className="command-snippet">
        <code className={DATA_CLASS}>{command}</code>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          aria-label={copied ? 'Copied' : 'Copy command'}>
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </div>
  );
}
