import React, { useContext } from 'react';
import { useFormContext } from 'react-hook-form';

import { Button } from '../components/button';
import type { ButtonProps } from '../components/button';
import { FormSubmitContext } from './form';

export type FormSubmitProps = {
  children: React.ReactNode;
  variant?: ButtonProps['variant'];
};

export function FormSubmit({ children, variant }: FormSubmitProps) {
  const { handleSubmit, formState } = useFormContext();
  const submitContext = useContext(FormSubmitContext);
  const onSubmit = submitContext?.onSubmit ?? (() => undefined);

  return (
    <Button
      variant={variant}
      disabled={formState.isSubmitting || !formState.isValid}
      onPress={handleSubmit(onSubmit)}>
      {children}
    </Button>
  );
}
