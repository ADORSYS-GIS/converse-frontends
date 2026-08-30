import { RefillCentre } from '../../../../../containers/refill-centre';

export const dynamic = 'force-dynamic';

/** `/accounts/<id>/refill` — the refill centre (IA v3 phase 3). The shell around it is mounted
 *  once by `(console)/layout.tsx`. */
export default function RefillRoute() {
  return <RefillCentre />;
}
