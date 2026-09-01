import { PoliciesCentre } from '../../../../containers/policies-centre';

/**
 * `/settings/policies` — "Project policies" (IA v3 phase E narrowed this from "Account / Project
 * policies" once account creation/rename moved to `/settings/accounts/<id>`). `force-dynamic` is
 * inherited from `settings/layout.tsx`.
 */
export default function SettingsPoliciesRoute() {
  return <PoliciesCentre />;
}
