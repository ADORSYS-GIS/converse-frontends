export type DeviceConfirmationStatus = 'ready' | 'loading' | 'error';

export interface DeviceConfirmationProps {
  /** @default 'ready' */
  status?: DeviceConfirmationStatus;
  /** POST target for the confirm form. */
  action: string;
  /** @default 'user_code' */
  fieldName?: string;
  /** Required when `status === 'ready'`. */
  userCode?: string;
  /** Human name of the requesting client; falls back to its id. Displayed, never linked. */
  clientName?: string;
  errorMessage?: string;
  /** @default 'Continue' */
  continueLabel?: string;
  /** Back-to-entry target rendered in the `error` state. */
  backHref?: string;
  className?: string;
}
