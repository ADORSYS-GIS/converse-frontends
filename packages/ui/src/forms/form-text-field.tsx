/**
 * FormTextField — the react-hook-form-wired single-line text field exported from
 * `@lightbridge/ui/forms`, alongside its siblings `FormTextArea` / `FormSelect` /
 * `FormCheckbox` / `FormSubmit`.
 *
 * It COMPOSES the presentational `FormField` layout shell exported from the package
 * barrel (`@lightbridge/ui`) — imported below aliased as `FieldShell` — and binds a
 * `TextField` to the form state via `useController`. The shell stays purely
 * presentational (label / description / helper / error around a child input slot);
 * this connected version is what screens actually reach for inside a `<Form>`.
 */
import React from 'react';
import { useController } from 'react-hook-form';

import { FormField as FieldShell } from '../components/form-field';
import { TextField } from '../components/text-field';
import type { TextFieldProps } from '../components/text-field';

export type FormTextFieldProps = Omit<TextFieldProps, 'value' | 'onChangeText' | 'onBlur'> & {
  name: string;
  label?: string;
  description?: string;
  placeholder?: string;
};

export function FormTextField({ name, label, description, ...props }: FormTextFieldProps) {
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
