import { OverviewCentre } from '../../containers/overview-centre';

export const dynamic = 'force-dynamic';

/** `/` — the Overview centre. The shell around it is mounted once by `(console)/layout.tsx`. */
export default function OverviewRoute() {
  return <OverviewCentre />;
}
