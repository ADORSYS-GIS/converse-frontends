import React, { useEffect, useRef, useState } from 'react';

import { cn } from '../../cn';
import { Button } from '../button';
import type { SecretRevealProps } from './types';

// Contract: docs/design/console-redesign/README.md §4 — one-time secret strip. Shown in the
// centre (api-keys.svg), dismissed only by the explicit `×` — never by blur or backdrop click.
export function SecretReveal({
  heading,
  description,
  secret,
  onDismiss,
  copiedLabel = 'Copied',
  copiedTimeoutMs = 2000,
  className,
}: SecretRevealProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  async function handleCopy() {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(secret);
    }
    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), copiedTimeoutMs);
  }

  return (
    <div className={cn('bg-surface rounded-[2px] p-5', className)}>
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-ink font-mono text-sm">{heading}</h2>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="text-subtle hover:text-soft font-mono text-sm transition-colors duration-150 ease-out">
          ×
        </button>
      </div>
      <p className="text-subtle mt-1 font-sans text-[10px] leading-[1.45]">{description}</p>
      <div className="mt-3 flex items-center gap-3">
        <input
          readOnly
          value={secret}
          aria-label="Secret value"
          onFocus={(event) => event.target.select()}
          className="border-border bg-chrome text-soft h-[32px] flex-1 rounded-[2px] border px-3 font-mono text-sm"
        />
        <Button type="button" variant="primary" onClick={handleCopy}>
          {copied ? copiedLabel : 'Copy'}
        </Button>
      </div>
    </div>
  );
}
