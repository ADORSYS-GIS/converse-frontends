import React from 'react';
import { useController } from 'react-hook-form';

import { FormField as FieldShell } from '../components/form-field';
import { Select } from '../components/select';
import type { SelectOption } from '../components/select';

export type FormSelectProps = {
  name: string;
  label?: string;
  options: SelectOption[];
  placeholder?: string;
};

export function FormSelect({ name, label, options, placeholder }: FormSelectProps) {
  const { field, fieldState } = useController({ name });

  return (
    <FieldShell label={label} error={fieldState.error?.message}>
      <Select
        value={field.value ?? ''}
        onValueChange={field.onChange}
        options={options}
        placeholder={placeholder}
      />
    </FieldShell>
  );
}
