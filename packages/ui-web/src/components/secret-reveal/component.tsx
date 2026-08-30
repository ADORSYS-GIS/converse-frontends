import { Field as BaseField } from '@base-ui/react/field';
import { Input as BaseInput } from '@base-ui/react/input';
import React, { useEffect, useRef, useState } from 'react';

import { cn } from '../../cn';
import { META_CLASS } from '../../lib/type-roles';
import { Button } from '../button';
import { fieldControlClassName } from '../field/field-classes';
import type { SecretRevealProps } from './types';

// Contract: docs/design/console-redesign/README.md §4 — one-time secret strip. Shown in the
// centre (api-keys.svg), dismissed only by the explicit `×` — never by blur or backdrop click.
//
// PRIMITIVE-MATRIX row 26 — daisy paint, our behaviour:
//   • the secret control wears daisy `input` through the shared `fieldControlClassName`
//     (row 28), so this security-sensitive strip and every `Field` in the console are painted by
//     the same class rather than by two hand-written strings that can drift apart;
//   • both `btn` axes arrive through `Button`, which is already `btn` + `btn-primary`/`btn-ghost`.
// What deliberately stays ours is the behaviour: the `navigator.clipboard` call, and the mono
// "Copied" acknowledgement on the button itself. That is NOT a toast, and not by omission —
// ADR 0008 rules transient toasts out for this acknowledgement, and PRIMITIVE-MATRIX row 49
// records the toast question as still-contested and explicitly undecided.
//
// THE CONTROL IS BASE UI'S. It used to be a raw element wearing a class string, and the cost of
// that was not cosmetic: the caption saying the secret cannot be retrieved again sat next to the
// control, associated with it by proximity alone. A screen-reader user landing on the secret heard
// "Secret value, read only" and never heard the one sentence that makes this strip urgent.
//
// Field.Root + Field.Description + Input closes exactly that, and the wiring was read out of the
// shipped source rather than assumed: Description registers its generated id on the field, and the
// Control folds every registered id into a describedby association through
// LabelableProvider.getDescriptionProps, which it reaches via getValidationProps. So the caption is
// now announced WITH the secret, with no id threading here and no second source of truth for it.
// Standing alone, Input is Field.Control with a ref and nothing else — which is why the Root and
// the Description come with it rather than the Input on its own.
//
// Two things stay deliberate. The accessible NAME is still the terse label prop: promoting the
// heading to a Field.Label instead would announce the secret as "New key created — shown once",
// which names the event rather than the control. And none of the state attributes Base UI adds
// here is styled — the `input` block in theme.css keys focus off the focus pseudo-class, so the
// strip's paint is byte-for-byte what it was.
//
// The third class PRIMITIVE-MATRIX row 26 lists, daisy `kbd`, is still NOT adopted: `kbd` paints a
// keycap around static text, while the secret must stay a focusable, select-on-focus, readonly
// control so it can be selected and copied by hand when the clipboard API is unavailable. A keycap
// here would trade a working fallback for a decoration. The strip's own panel and the geometry of
// its three rows are `secret-strip` in theme.css, selected structurally — the strip has exactly
// this shape and no other, so its rows need no class each, and Field.Root and Field.Description
// render the same div and paragraph that shape already selects.
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
    // Best-effort, the same contract every other clipboard write in this app follows
    // (`AccountBadge`'s own `onCopyId`): the write can genuinely fail (permission denied, an
    // insecure origin), and the secret stays focused/selected either way as the manual-copy
    // fallback, so a failure here is silent rather than an unhandled rejection — never a claimed
    // "Copied" for a copy that didn't happen.
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(secret);
      } else {
        return;
      }
    } catch {
      return;
    }
    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), copiedTimeoutMs);
  }

  return (
    <BaseField.Root className={cn('secret-strip', className)}>
      <div>
        <h2>{heading}</h2>
        <Button variant="ghost" size="sm" onClick={onDismiss} aria-label="Dismiss">
          ×
        </Button>
      </div>
      <BaseField.Description className={META_CLASS}>{description}</BaseField.Description>
      <div>
        <BaseInput
          readOnly
          value={secret}
          aria-label="Secret value"
          onFocus={(event) => event.target.select()}
          // The one raw `<input>` in the library that shows a DATA value in the field control's
          // clothing (phase 9 — `input`'s own mono went sans-by-default with the rest of the
          // console's controls; a secret key is data, so it opts back in here, at the call site
          // that actually renders one).
          className={cn(fieldControlClassName, 'font-mono')}
        />
        <Button type="button" variant="primary" onClick={handleCopy}>
          {copied ? copiedLabel : 'Copy'}
        </Button>
      </div>
    </BaseField.Root>
  );
}
