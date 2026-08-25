import { Field as BaseField } from '@base-ui/react/field';
import React, { forwardRef, useId } from 'react';

import { cn } from '../../cn';
import { fieldLabelClassName } from './field-classes';
import type { FieldProps } from './types';

// Contract: docs/design/console-redesign/README.md §4 — `chrome` inset fill, `border` line,
// radius 2, height 30; focus = border → `--signal`; error = border `--signal` + a `meta` line.
//
// ADR 0010 Decision 4: Base UI `Field.Root`/`Field.Label` own label association
// (`aria-labelledby` via context, no manual `htmlFor`/`id` pairing) and invalid/disabled state.
// daisy's `input`/`textarea` classes supply the reset (appearance, cursor, `--radius-field`),
// layered with `!` utilities wherever daisy's own opinions (`base-100` fill, a focus outline
// ring, a `width: clamp(3rem, 20rem, 100%)` cap) fight our tokens. `validator`/`validator-hint`
// are skipped: error reuses `--signal` (no second accent, ADR 0008), so a plain `aria-invalid:`
// variant says the same thing without a `--color-error` token that would only alias `primary`.
const CONTROL_CLASS = cn(
  'input h-[30px]! w-full! rounded-[2px]! border! border-border! bg-chrome! px-3! font-mono',
  'text-sm text-soft placeholder:text-subtle shadow-none! outline-none!',
  'focus:border-primary! focus-within:outline-none! aria-invalid:border-primary!',
  'disabled:cursor-not-allowed disabled:opacity-60',
);

const TEXTAREA_CLASS = cn(
  'textarea min-h-[80px]! w-full! resize-y! rounded-[2px]! border! border-border! bg-chrome! p-3!',
  'font-mono text-sm text-soft placeholder:text-subtle shadow-none! outline-none!',
  'focus:border-primary! focus-within:outline-none! aria-invalid:border-primary!',
  'disabled:cursor-not-allowed disabled:opacity-60',
);

export const Field = forwardRef<HTMLInputElement | HTMLTextAreaElement, FieldProps>(function Field(
  props,
  ref,
) {
  const { label, error, containerClassName, className, id, multiline, ...rest } = props;
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const errorId = error ? `${controlId}-error` : undefined;

  return (
    <BaseField.Root invalid={Boolean(error)} className={cn('flex flex-col gap-1.5', containerClassName)}>
      <BaseField.Label className={fieldLabelClassName}>{label}</BaseField.Label>
      {multiline ? (
        <BaseField.Control
          {...(rest as unknown as React.ComponentPropsWithoutRef<typeof BaseField.Control>)}
          ref={ref as React.Ref<HTMLTextAreaElement>}
          render={<textarea />}
          id={controlId}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          className={cn(TEXTAREA_CLASS, className)}
        />
      ) : (
        <BaseField.Control
          {...(rest as React.InputHTMLAttributes<HTMLInputElement>)}
          ref={ref as React.Ref<HTMLInputElement>}
          id={controlId}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          className={cn(CONTROL_CLASS, className)}
        />
      )}
      {error ? (
        <p id={errorId} className="font-mono text-[11px] leading-[1.4] text-primary">
          {error}
        </p>
      ) : null}
    </BaseField.Root>
  );
});
