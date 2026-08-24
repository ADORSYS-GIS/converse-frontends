import React, { forwardRef, useId } from 'react';

import { cn } from '../../cn';
import { fieldControlVariants, fieldLabelClassName } from './cva';
import type { FieldProps } from './types';

export const Field = forwardRef<HTMLInputElement | HTMLTextAreaElement, FieldProps>(function Field(
  props,
  ref,
) {
  const { label, error, containerClassName, className, id, multiline, ...rest } = props;
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const errorId = error ? `${controlId}-error` : undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', containerClassName)}>
      <label htmlFor={controlId} className={fieldLabelClassName}>
        {label}
      </label>
      {multiline ? (
        <textarea
          {...(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          ref={ref as React.Ref<HTMLTextAreaElement>}
          id={controlId}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          className={cn(fieldControlVariants({ error: Boolean(error), multiline: true }), className)}
        />
      ) : (
        <input
          {...(rest as React.InputHTMLAttributes<HTMLInputElement>)}
          ref={ref as React.Ref<HTMLInputElement>}
          id={controlId}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          className={cn(fieldControlVariants({ error: Boolean(error), multiline: false }), className)}
        />
      )}
      {error ? (
        <p id={errorId} className="font-mono text-[11px] leading-[1.4] text-primary">
          {error}
        </p>
      ) : null}
    </div>
  );
});
