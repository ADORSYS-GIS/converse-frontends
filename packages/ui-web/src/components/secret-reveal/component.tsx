import React, { useEffect, useRef, useState } from 'react';

import { cn } from '../../cn';
import { Button } from '../button';
import { fieldControlClassName } from '../field/field-classes';
import type { SecretRevealProps } from './types';

// Contract: docs/design/console-redesign/README.md §4 — one-time secret strip. Shown in the
// centre (api-keys.svg), dismissed only by the explicit `×` — never by blur or backdrop click.
//
// PRIMITIVE-MATRIX row 26 — daisy paint, our behaviour:
//   • the secret `<input>` wears daisy `input` through the shared `fieldControlClassName`
//     (row 28), so this security-sensitive strip and every `Field` in the console are painted by
//     the same class rather than by two hand-written strings that can drift apart;
//   • both `btn` axes arrive through `Button`, which is already `btn` + `btn-primary`/`btn-ghost`.
// What deliberately stays ours is the behaviour: the `navigator.clipboard` call, and the mono
// "Copied" acknowledgement on the button itself. That is NOT a toast, and not by omission —
// ADR 0008 rules transient toasts out for this acknowledgement, and PRIMITIVE-MATRIX row 49
// records the toast question as still-contested and explicitly undecided.
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
        <Button variant="ghost" size="sm" onClick={onDismiss} aria-label="Dismiss">
          ×
        </Button>
      </div>
      <p className="text-subtle mt-1 font-sans text-[10px] leading-[1.45]">{description}</p>
      <div className="mt-3 flex items-center gap-3">
        <input
          readOnly
          value={secret}
          aria-label="Secret value"
          onFocus={(event) => event.target.select()}
          className={cn(fieldControlClassName, 'flex-1')}
        />
        <Button type="button" variant="primary" onClick={handleCopy}>
          {copied ? copiedLabel : 'Copy'}
        </Button>
      </div>
    </div>
  );
}
