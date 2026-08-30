import { Field as BaseField } from '@base-ui/react/field';
import React, { forwardRef, useId } from 'react';

import { cn } from '../../cn';
import { LABEL_CLASS } from '../../lib/type-roles';
import { fieldControlClassName, fieldLabelClassName } from './field-classes';
import type { FieldProps } from './types';

// Contract: docs/design/console-redesign/README.md §4 — `chrome` inset fill, `border` line,
// radius 2, height 30; focus = border to `--signal`; error = border `--signal` + a `meta` line.
//
// ADR 0010 Decision 4: Base UI Field.Root/Field.Label own label association (the aria-labelledby
// wiring, with no manual htmlFor or id pairing) and invalid/disabled state. daisy owns every
// pixel: `input`/`textarea` are the control, `fieldset`/`label` are the two layouts. Nothing about the
// control's paint is written here any more — it is one `@utility input` block in `theme.css`,
// shared with the three Select/Popover triggers, so "the Field treatment" is a single definition
// rather than four copies that drift.
export const Field = forwardRef<HTMLInputElement | HTMLTextAreaElement, FieldProps>(
  function Field(props, ref) {
    const { label, error, containerClassName, className, id, multiline, layout, hideLabel, ...rest } =
      props;
    // A label beside a textarea has nothing to align to, so `inline` is ignored when multiline.
    const inline = layout === 'inline' && !multiline;
    const generatedId = useId();
    const controlId = id ?? generatedId;
    const errorId = error ? `${controlId}-error` : undefined;

    return (
      <BaseField.Root
        invalid={Boolean(error)}
        // daisy's own two field layouts: `label` sets label and control side by side, `fieldset`
        // stacks them. See the `@utility` pair in `theme.css`.
        className={cn(inline ? 'label' : 'fieldset', containerClassName)}>
        <BaseField.Label className={hideLabel ? 'sr-only' : fieldLabelClassName}>
          {label}
        </BaseField.Label>
        {multiline ? (
          <BaseField.Control
            {...(rest as unknown as React.ComponentPropsWithoutRef<typeof BaseField.Control>)}
            ref={ref as React.Ref<HTMLTextAreaElement>}
            render={<textarea />}
            id={controlId}
            aria-invalid={Boolean(error)}
            aria-describedby={errorId}
            className={cn('textarea', className)}
          />
        ) : (
          <BaseField.Control
            {...(rest as React.InputHTMLAttributes<HTMLInputElement>)}
            ref={ref as React.Ref<HTMLInputElement>}
            id={controlId}
            aria-invalid={Boolean(error)}
            aria-describedby={errorId}
            className={cn(fieldControlClassName, className)}
          />
        )}
        {error ? (
          // The `meta` type role in the signal colour — same one definition as every other label,
          // recoloured. The control's own error border is aria-invalid-driven CSS, not a class.
          <p id={errorId} className={cn(LABEL_CLASS, 'text-primary')}>
            {error}
          </p>
        ) : null}
      </BaseField.Root>
    );
  }
);
