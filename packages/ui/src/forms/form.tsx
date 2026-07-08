import React, { createContext } from 'react';
import { View } from 'react-native';
import type { ViewProps } from 'react-native';
import { FormProvider, useForm } from 'react-hook-form';
import type { DefaultValues, FieldValues, SubmitHandler } from 'react-hook-form';

// FormSubmitContext carries the caller's `onSubmit` alongside RHF's own context so
// that `FormSubmit` — which lives arbitrarily deep in the tree — can reach it
// without prop-drilling. RHF's FormProvider only exposes the form methods, not the
// submit intent, so this small companion context bridges that gap.
export type FormSubmitContextValue = {
  onSubmit: SubmitHandler<FieldValues>;
};

export const FormSubmitContext = createContext<FormSubmitContextValue | null>(null);

export type FormProps = ViewProps & {
  defaultValues?: DefaultValues<FieldValues>;
  onSubmit: SubmitHandler<FieldValues>;
  children: React.ReactNode;
};

export function Form({ defaultValues, onSubmit, children, ...props }: FormProps) {
  const methods = useForm<FieldValues>({ defaultValues, mode: 'onTouched' });

  return (
    <FormProvider {...methods}>
      <FormSubmitContext.Provider value={{ onSubmit }}>
        <View {...props}>{children}</View>
      </FormSubmitContext.Provider>
    </FormProvider>
  );
}
