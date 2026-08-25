import { ScopeEchoRail } from '../../../containers/scope-echo-rail';

export const dynamic = 'force-dynamic';

/** `/` — the Overview left-rail secondary section (the read-only SCOPE echo). */
export default function OverviewScopeRoute() {
  return <ScopeEchoRail />;
}
