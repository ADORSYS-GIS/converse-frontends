'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useConsoleAuthzClient } from '../client/rpc-clients';
import { useCan } from '../client/use-can';
import { PERMISSION } from '../shared/permissions';
import {
  actorIdsKey,
  apiKeyIdsOnly,
  buildLabelFor,
  hasActorIds,
  IDENTITY_LABEL_FOR,
  type ActorIds,
  type LabelFor,
} from './actor-labels';

/**
 * ONE `resolveActorLabels` call for a whole dashboard page (converse-frontends#448, story C5;
 * backend lane A2).
 *
 * Not one per panel, and emphatically not one per ROW: `/admin/usage` puts a user lens on five
 * panels and a table of up to two hundred actors on the same screen, so a per-row lookup would be
 * an N+1 measured in hundreds. `use-dashboard.ts` collects every actor id across every panel's
 * response first (`collectActorIds`), and this hook resolves all four kinds in the single batch
 * the procedure was built for.
 *
 * **The batch is trimmed to what the caller may ask for.** `resolveActorLabels` is gated PER KIND
 * (lightbridge-authz#674): `apiKeyIds` is row-scoped through `ApiKey`'s own read policy and served
 * to anyone, while `userIds`/`accountIds`/`projectIds` still need `user:read` and are REFUSED with
 * a 403 for a caller who does not hold it. So a caller without `user:read` sends the API-key ids
 * only. This is not a client-side authorization decision — the backend enforces both halves — it is
 * the console declining to send a request it knows will fail. Before it, every dashboard page an
 * ordinary member opened fired a `resolveActorLabels` that 403'd and captioned "Actor names could
 * not be resolved"; now those pages get their key names and no error line.
 *
 * **The cache key is the SORTED id list**, not the array's identity: two renders that discovered
 * the same ids in a different order (a different panel resolving first, a re-sort of a table) must
 * share one cache entry rather than re-fetching. `actorIdsKey` is that normalization, and it is the
 * same discipline `resolve-dashboard.ts`'s `queryKey` applies to usage requests.
 *
 * **A failed lookup never fails the page.** `labelFor` falls back to `sentinelLabel` for every id,
 * so panels render their real spend figures against raw ids rather than an error — the numbers are
 * the reading, the names are the convenience. `status` is surfaced so a caller can caption it, and
 * `/admin/usage` does.
 */

export interface ActorLabelResolver {
  labelFor: LabelFor;
  status: 'idle' | 'loading' | 'error' | 'ready';
  /** Present only on failure — the page captions it rather than swallowing it. */
  errorMessage?: string;
}

export function useActorLabels(ids: ActorIds): ActorLabelResolver {
  const client = useConsoleAuthzClient();
  const { can } = useCan();
  const canReadEstateWide = can(PERMISSION.userRead);
  // Trimmed BEFORE the cache key is taken, so a caller without `user:read` and a caller with it
  // never share an entry for what are, on the wire, two different requests.
  const requested = canReadEstateWide ? ids : apiKeyIdsOnly(ids);
  const key = actorIdsKey(requested);
  const enabled = hasActorIds(requested);

  const query = useQuery({
    queryKey: ['actor-labels', key],
    // The ids are read from the closure rather than from `key` because `key` is a normalized
    // STRING: reconstructing the four lists by splitting it would be a second, silently divergent
    // encoding of the same data.
    queryFn: () =>
      client.procedures.resolveActorLabels({
        args: {
          userIds: requested.users,
          accountIds: requested.accounts,
          projectIds: requested.projects,
          apiKeyIds: requested.apiKeys,
        },
      }),
    enabled,
    // Identities change on the scale of a person renaming an account, not on the scale of a range
    // picker. Five minutes keeps a lens toggle (which re-resolves the same ids under a different
    // group_by) free of a second lookup.
    staleTime: 300_000,
  });

  const labelFor = useMemo(
    () => (query.data ? buildLabelFor(query.data) : IDENTITY_LABEL_FOR),
    [query.data]
  );

  if (!enabled) return { labelFor: IDENTITY_LABEL_FOR, status: 'idle' };
  if (query.isError) {
    return {
      labelFor,
      status: 'error',
      errorMessage:
        'Actor names could not be resolved, so rows below are identified by id. The spend, ' +
        'request and token figures are unaffected.',
    };
  }
  if (query.isPending) return { labelFor, status: 'loading' };
  return { labelFor, status: 'ready' };
}
