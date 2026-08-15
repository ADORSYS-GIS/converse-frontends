import type { ReactNode } from 'react';
import type { PressableProps, ViewProps } from 'react-native';

import type { DataCardVariantProps } from './cva';

export type DataCardItem = {
  label: string;
  value: ReactNode;
};

export type DataCardProps = (ViewProps | PressableProps) &
  DataCardVariantProps & {
    title: ReactNode;
    subtitle?: ReactNode;
    /** Slot before the title — an Avatar, an icon Div, etc. */
    leading?: ReactNode;
    /** Slot after the title/subtitle column — typically a Badge. */
    status?: ReactNode;
    /** Slot at the far end of the header row — a button or menu trigger. */
    trailing?: ReactNode;
    /** Record metadata rendered as a wrapping grid of label/value pairs. */
    items?: DataCardItem[];
    /** Content below the metadata grid — tags, a divider + actions, etc. */
    footer?: ReactNode;
    onPress?: PressableProps['onPress'];
  };
