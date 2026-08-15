import type { ReactNode } from 'react';
import type { ViewProps } from 'react-native';

import type { ConfirmDialogVariantProps } from './cva';

export type ConfirmDialogProps = ViewProps &
  ConfirmDialogVariantProps & {
    title: string;
    message?: ReactNode;
    /** Leading icon slot, e.g. a Div-wrapped Feather glyph. */
    icon?: ReactNode;
    confirmLabel: string;
    cancelLabel: string;
    onConfirm: () => void;
    /** Typically the sheet's `dismiss` — see useSheet(). */
    onCancel: () => void;
    loading?: boolean;
    /** Gate confirm without hiding it — e.g. while a typed-confirmation input doesn't match. */
    confirmDisabled?: boolean;
    /** Content between the message and the action row — a typed-confirmation TextField, a checkbox, etc. */
    children?: ReactNode;
  };
