import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export type SheetHandle = {
  /** Programmatically dismiss the sheet (e.g. from a Cancel button). */
  close: () => void;
};

export type SheetProps = {
  children: ReactNode;
  /** Called when the sheet is dismissed (dragged down or backdrop-tapped). */
  onClose?: () => void;
  /** Fixed snap points; when omitted the sheet sizes to its content. */
  snapPoints?: (string | number)[];
  contentStyle?: StyleProp<ViewStyle>;
};
