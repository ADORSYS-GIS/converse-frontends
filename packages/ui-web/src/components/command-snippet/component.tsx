import React, { useEffect, useRef, useState } from 'react';

import { cn } from '../../cn';
import { Button } from '../button';
import type { CommandSnippetProps } from './types';

// Gap-list item (LCI design pass, `docs/design/lci-app/PRIMITIVES.md`): a read-only shell
// command with a copy button, e.g. the `kubectl logs` one-liner for streaming a run's logs.
// Copy-to-clipboard logic mirrors `SecretReveal`'s (same reset-on-timeout shape) rather than a
// new shared hook — one other call site isn't enough to justify the abstraction.
export function CommandSnippet({ command, label, className }: CommandSnippetProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  async function handleCopy() {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(command);
    }
    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label ? <span className="text-subtle font-mono text-[10px]">{label}</span> : null}
      <div className="border-border bg-chrome flex items-center gap-2 rounded-[2px] border px-2.5 py-1.5">
        <code className="text-soft min-w-0 flex-1 overflow-x-auto font-mono text-xs whitespace-nowrap">
          {command}
        </code>
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
