import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { AuthPanelShell } from '@lightbridge/ui-web/src/sections/auth-panel-shell';
import { DeviceConfirmation } from '@lightbridge/ui-web/src/sections/device-confirmation';
import type { DeviceConfirmationStatus } from '@lightbridge/ui-web/src/sections/device-confirmation';

import { DEVICE_VERIFY_CONTEXT_PATH, DEVICE_VERIFY_CONTINUE_PATH } from './paths';
import { ROUTER_BASENAME } from './route-table';

// What the confirmation page displays, and nothing more — mirrors lightbridge-authz's
// `VerifyContext` (relying_party.rs).
interface VerifyContext {
  user_code: string;
  client_id: string;
}

// Same-origin JSON under `default-src 'self'` (no connect-src directive → default-src applies;
// static_assets.rs:63). `credentials: 'same-origin'` is fetch's default but is stated so the
// __Host- device cookie requirement is visible at the call site — that cookie IS the binding.
// The SPA makes NO auth decision here: it renders whatever Rust says, or leaves.
// 404 is the uniform "no live confirmation for this browser" answer (absent cookie, stale
// cookie, consumed code — indistinguishable, by design), so it maps to one action: go back.
export function DeviceConfirmRoute() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<DeviceConfirmationStatus>('loading');
  const [context, setContext] = useState<VerifyContext | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch(DEVICE_VERIFY_CONTEXT_PATH, {
          credentials: 'same-origin',
          signal: controller.signal,
        });

        if (response.status === 404) {
          // replace: true — Back must not bounce the user into a dead confirmation.
          navigate('/device', { replace: true });
          return;
        }

        if (!response.ok) {
          setStatus('error');
          return;
        }

        const body = (await response.json()) as VerifyContext;
        setContext(body);
        setStatus('ready');
      } catch {
        if (controller.signal.aborted) return;
        setStatus('error');
      }
    }

    void load();

    return () => controller.abort();
  }, [navigate]);

  return (
    <AuthPanelShell title="Confirm this device">
      <DeviceConfirmation
        status={status}
        action={DEVICE_VERIFY_CONTINUE_PATH}
        userCode={context?.user_code}
        clientName={context?.client_id}
        backHref={`${ROUTER_BASENAME}/device`}
      />
    </AuthPanelShell>
  );
}
