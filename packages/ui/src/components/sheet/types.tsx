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

/** Helpers handed to sheet content so it can dismiss itself (e.g. Cancel). */
export type SheetHelpers = {
  /** Dismiss the currently-presented sheet. */
  dismiss: () => void;
};

/** Renders the sheet body. Receives {@link SheetHelpers} so a Cancel/Done
 * button can close the sheet without threading a callback through props. */
export type SheetRender = (helpers: SheetHelpers) => ReactNode;

export type SheetOptions = {
  /** Fixed snap points; when omitted the sheet sizes to its content. */
  snapPoints?: (string | number)[];
  contentStyle?: StyleProp<ViewStyle>;
  /** Fired once the sheet has fully dismissed (drag, backdrop, or `dismiss()`). */
  onClose?: () => void;
};

/** Imperative API returned by {@link useSheet}. */
export type SheetApi = {
  /** Present `render` as a bottom sheet, replacing any open sheet. */
  present: (render: SheetRender, options?: SheetOptions) => void;
  /** Dismiss the current sheet, if any. */
  dismiss: () => void;
};

export type SheetProviderProps = {
  children: ReactNode;
  /** Sheet surface colour; defaults to gorhom's white when omitted. */
  backgroundColor?: string;
  /** Grabber-handle colour. */
  handleIndicatorColor?: string;
};
