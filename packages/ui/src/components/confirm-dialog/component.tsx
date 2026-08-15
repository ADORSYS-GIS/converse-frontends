import React from 'react';
import { View } from 'react-native';
import type { ViewProps } from 'react-native';

import { cn } from '../../cn';
import { Button } from '../button';
import { Stack } from '../stack';
import { Text } from '../text';
import { confirmDialogVariants } from './cva';
import type { ConfirmDialogProps } from './types';

const ViewBase = View as React.ComponentType<ViewProps & { className?: string }>;

/**
 * A self-contained "confirm or cancel" surface — present it as the content
 * of an imperative sheet:
 *
 * ```tsx
 * const sheet = useSheet();
 * sheet.present(({ dismiss }) => (
 *   <ConfirmDialog
 *     title={t('revoke.title')}
 *     message={t('revoke.message', { name })}
 *     confirmLabel={t('revoke.confirm')}
 *     cancelLabel={t('revoke.cancel')}
 *     tone="danger"
 *     loading={revoke.isPending}
 *     onCancel={dismiss}
 *     onConfirm={async () => { await revoke.mutateAsync(id); dismiss(); }}
 *   />
 * ));
 * ```
 *
 * This is exactly the shape useSheet()'s own doc example anticipates
 * (`sheet.present(({ dismiss }) => <ConfirmView onCancel={dismiss} … />)`),
 * generalized out of the app's repeated delete/revoke views. For a typed
 * "type PROJECT-NAME to confirm" affordance, pass a TextField as `children`
 * and drive `confirmDisabled` from its value — see the app's
 * delete-project/delete-account views for that pattern; this primitive
 * only owns the disable-until-ready gate, not the string-matching logic
 * (which stays app-owned since it's tied to i18n'd fallback copy).
 *
 * Not a modal/overlay itself — it has no backdrop or dismiss-on-outside-tap.
 * Host it in `<Sheet>`/`useSheet()` (imperative bottom sheet) for that, or
 * inline in a page for a non-modal confirmation.
 */
export function ConfirmDialog({
  title,
  message,
  icon,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  loading = false,
  confirmDisabled = false,
  tone,
  children,
  ...props
}: ConfirmDialogProps) {
  return (
    <ViewBase className={cn(confirmDialogVariants({ tone }))} {...props}>
      <Stack gap="md">
        <Stack direction="row" gap="sm" align="start">
          {icon}
          <Stack gap="xs" style={{ flex: 1 }}>
            <Text intent="bodyStrong">{title}</Text>
            {message ? (
              typeof message === 'string' ? (
                <Text intent="body">{message}</Text>
              ) : (
                message
              )
            ) : null}
          </Stack>
        </Stack>
        {children}
        <Stack direction="row" gap="sm">
          <Button variant="ghost" onPress={onCancel} disabled={loading} style={{ flex: 1 }}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            onPress={onConfirm}
            disabled={loading || confirmDisabled}
            style={{ flex: 1 }}>
            {confirmLabel}
          </Button>
        </Stack>
      </Stack>
    </ViewBase>
  );
}
