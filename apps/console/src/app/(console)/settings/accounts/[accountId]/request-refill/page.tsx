import { RefillCentre } from '../../../../../../containers/refill-centre';

export const dynamic = 'force-dynamic';

/** `/settings/accounts/<id>/request-refill` — the refill centre (IA v3 phase 3, moved from
 *  `/accounts/<id>/refill` this phase — the old path 308s here verbatim, `?project=` included,
 *  `middleware.ts`). The shell around it is mounted once by `(console)/layout.tsx`. */
export default function RequestRefillRoute() {
  return <RefillCentre />;
}
