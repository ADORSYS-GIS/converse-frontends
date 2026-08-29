import { ApiKeysControlsRail } from '../../../../containers/api-keys-controls-rail';

export const dynamic = 'force-dynamic';

/** `/api-keys` — the left rail's secondary section: key filters and the create action. */
export default function ApiKeysScopeSlot() {
  return <ApiKeysControlsRail />;
}
