import { AuthErrorPanel } from '@lightbridge/ui-web/src/sections/auth-error-panel';
import { AuthPanelShell } from '@lightbridge/ui-web/src/sections/auth-panel-shell';

// D8: every former `generic_failure` call site on the RP leg now redirects here with one uniform
// 303, the distinction preserved in server logs (`reason=...`) rather than in HTTP or in this
// page's copy. Static: no props, no fetch.
export function ErrorRoute() {
  return (
    <AuthPanelShell title="Sign-in unavailable">
      <AuthErrorPanel />
    </AuthPanelShell>
  );
}
