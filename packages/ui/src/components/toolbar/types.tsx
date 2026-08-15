import type { ReactNode } from 'react';
import type { ViewProps } from 'react-native';

import type { ToolbarVariantProps } from './cva';

export type ToolbarProps = ViewProps &
  ToolbarVariantProps & {
    /** Left-hand slot — search field, filter chips, a section title. Grows to fill available space. */
    leading?: ReactNode;
    /** Right-hand slot — action buttons. Never shrinks below its content. */
    trailing?: ReactNode;
  };
