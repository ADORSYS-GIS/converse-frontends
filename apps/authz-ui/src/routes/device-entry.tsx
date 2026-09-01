import { useSearchParams } from 'react-router';

import { AuthPanelShell } from '@lightbridge/ui-web/src/sections/auth-panel-shell';
import { DeviceCodeEntry } from '@lightbridge/ui-web/src/sections/device-code-entry';

import { DEVICE_VERIFY_SUBMIT_PATH } from './paths';

// device_store.rs's USER_CODE_ALPHABET (Crockford-style: no I, L, O, U) plus the display
// separator. Clamped because this value comes off the URL bar; it is rendered ONLY as an
// <input value> and never reaches a link, a fetch URL, or any HTML sink.
export function sanitiseUserCode(raw: string | null): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw.toUpperCase().replace(/[^0-9A-HJKMNP-TV-Z-]/g, '');
  return cleaned.length > 0 ? cleaned.slice(0, 16) : undefined;
}

interface DeviceEntryRouteProps {
  /** `/device/invalid` — the SPA's own uniform failure landing (D9: `lookup_pending_session`
   *  redirects here for unknown/expired/consumed codes, indistinguishably). */
  invalidCode?: boolean;
}

// `?user_code=` is the one query-param exception in this SPA (plan D4): it is
// `verification_uri_complete`'s (RFC 8628) already wire-visible prefill, single-use and
// minutes-lived. Sanitised through `sanitiseUserCode` before it ever reaches a DOM sink.
export function DeviceEntryRoute({ invalidCode = false }: DeviceEntryRouteProps) {
  const [searchParams] = useSearchParams();
  const defaultUserCode = sanitiseUserCode(searchParams.get('user_code'));

  return (
    <AuthPanelShell
      title="Enter your device code"
      lead="Enter the code shown on your device to continue.">
      <DeviceCodeEntry
        action={DEVICE_VERIFY_SUBMIT_PATH}
        defaultUserCode={defaultUserCode}
        errorMessage={invalidCode ? 'That code cannot be used.' : undefined}
      />
    </AuthPanelShell>
  );
}
