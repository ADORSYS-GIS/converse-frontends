/**
 * Connected FormField — the react-hook-form-wired single-line text field exported
 * from `@lightbridge/ui/forms`.
 *
 * IMPORTANT: this is DISTINCT from the presentational `FormField` exported from the
 * package barrel (`@lightbridge/ui`). That one is a pure layout shell
 * (label / description / helper / error around a child input slot). This connected
 * version COMPOSES that shell — imported below aliased as `FieldShell` — and binds a
 * `TextField` to the form state via `useController`.
 */
import React from 'react';
import { useController } from 'react-hook-form';

import { FormField as FieldShell } from '../components/form-field';
import { TextField } from '../components/text-field';
import type { TextFieldProps } from '../components/text-field';

export type FormFieldProps = Omit<TextFieldProps, 'value' | 'onChangeText' | 'onBlur'> & {
  name: string;
  label?: string;
  description?: string;
  placeholder?: string;
};

export function FormField({ name, label, description, ...props }: FormFieldProps) {
  const { field, fieldState } = useController({ name });

  return (
    <FieldShell label={label} description={description} error={fieldState.error?.message}>
      <TextField
        value={field.value ?? ''}
        onChangeText={field.onChange}
        onBlur={field.onBlur}
        {...props}
      />
    </FieldShell>
  );
}
