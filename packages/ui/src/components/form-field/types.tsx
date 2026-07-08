import type { ReactNode } from 'react';
import type { ViewProps } from 'react-native';

import type { FormFieldVariantProps } from './cva';

export type FormFieldProps = ViewProps &
  FormFieldVariantProps & {
    label?: string;
    description?: string;
    helper?: string;
    error?: string;
    children: ReactNode;
  };
