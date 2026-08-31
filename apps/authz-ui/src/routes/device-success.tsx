import { AuthPanelShell } from '@lightbridge/ui-web/src/sections/auth-panel-shell';
import { BODY_CLASS } from '@lightbridge/ui-web/src/lib/type-roles';

// The terminal state of the device-pairing flow (V3: the fourth `verification_response` call
// site, `callback:1014` — 200 + cookie clear). Static: no props, no fetch, nothing left to do but
// tell the person to go back to the client that started the flow.
export function DeviceSuccessRoute() {
  return (
    <AuthPanelShell title="Device paired">
      <p className={BODY_CLASS}>You can return to your application.</p>
    </AuthPanelShell>
  );
}
