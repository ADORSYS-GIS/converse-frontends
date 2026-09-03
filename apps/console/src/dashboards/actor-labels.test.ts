import type { UsageQueryResponse, UsageSeriesPoint } from '@lightbridge/api-rest';
import type { ActorLabels } from '@lightbridge/authz-rpc';
import { describe, expect, it } from 'vitest';

import { UNASSIGNED_KEY } from '../containers/overview-usage';
import {
  ACTOR_ID_BATCH_CAP,
  actorIdsKey,
  apiKeyIdsOnly,
  buildLabelFor,
  collectActorIds,
  hasActorIds,
  IDENTITY_LABEL_FOR,
  actorIdsOf,
  withSeedActorIds,
} from './actor-labels';

function point(overrides: Partial<UsageSeriesPoint>): UsageSeriesPoint {
  return {
    bucket_start: '2026-09-01T00:00:00Z',
    completion_tokens: 0,
    latency_samples: 0,
    prompt_tokens: 0,
    requests: 1,
    total_cost: 0,
    total_tokens: 0,
    usage_value: 0,
    ...overrides,
  };
}

const response = (points: UsageSeriesPoint[]): UsageQueryResponse => ({ points, truncated: false });

const labels: ActorLabels = {
  users: [
    { userId: 'usr_1', displayName: 'Ada Lovelace', email: 'ada@example.com' },
    { userId: 'usr_email_only', displayName: null, email: 'grace@example.com' },
    { userId: 'usr_bare', displayName: null, email: null },
  ],
  accounts: [{ accountId: 'acct_1', name: 'Production', ownerUserId: 'usr_1' }],
  projects: [{ projectId: 'proj_1', name: 'Ingest', accountId: 'acct_1' }],
  apiKeys: [
    {
      apiKeyId: 'key_live',
      name: 'Production ingest',
      projectId: 'proj_1',
      accountId: 'acct_1',
      revoked: false,
    },
    {
      apiKeyId: 'key_dead',
      name: 'Retired loader',
      projectId: 'proj_1',
      accountId: 'acct_1',
      revoked: true,
    },
    {
      apiKeyId: 'key_orphan',
      name: 'Elsewhere',
      projectId: 'proj_unresolved',
      accountId: 'acct_1',
      revoked: false,
    },
  ],
};

/** The four required lists, so a fixture only has to name the kinds it cares about. */
const ids = (partial: Partial<Parameters<typeof actorIdsKey>[0]>) => ({
  users: [],
  accounts: [],
  projects: [],
  apiKeys: [],
  ...partial,
});

describe('collectActorIds', () => {
  it('gathers all four kinds across every response, in one batch', () => {
    const collected = collectActorIds([
      response([point({ user_id: 'usr_1' }), point({ account_id: 'acct_1' })]),
      response([point({ project_id: 'proj_1' })]),
      // API keys are collected exactly like the other three — the "Spend by API key" panel is the
      // one that had no name to show before lightbridge-authz#674.
      response([point({ api_key_id: 'key_live' } as Partial<UsageSeriesPoint>)]),
      undefined,
    ]);
    expect(collected).toEqual(
      ids({
        users: ['usr_1'],
        accounts: ['acct_1'],
        projects: ['proj_1'],
        apiKeys: ['key_live'],
      })
    );
  });

  it('orders by the requests each id carries, so the cap keeps what matters', () => {
    const collected = collectActorIds([
      response([
        point({ user_id: 'quiet', requests: 1 }),
        point({ user_id: 'busy', requests: 900 }),
        point({ user_id: 'quiet', requests: 1 }),
      ]),
    ]);
    expect(collected.users).toEqual(['busy', 'quiet']);
  });

  it('caps each list independently at the procedure own limit — it REJECTS a longer batch', () => {
    const many = Array.from({ length: ACTOR_ID_BATCH_CAP + 50 }, (_, i) =>
      point({ user_id: `usr_${i}`, requests: ACTOR_ID_BATCH_CAP + 50 - i })
    );
    const collected = collectActorIds([response(many)]);
    expect(collected.users).toHaveLength(ACTOR_ID_BATCH_CAP);
    // Highest-traffic first, so the ones an operator is looking at survive the cap.
    expect(collected.users[0]).toBe('usr_0');
  });

  it('never asks the backend to resolve the Unassigned sentinel or an empty id', () => {
    const collected = collectActorIds([
      response([point({ user_id: UNASSIGNED_KEY }), point({ account_id: '' })]),
    ]);
    expect(collected).toEqual(ids({}));
  });

  it('is empty, not undefined, for an empty page — all four lists are required by the RPC', () => {
    expect(collectActorIds([])).toEqual(ids({}));
    expect(hasActorIds(collectActorIds([]))).toBe(false);
  });

  it('counts API-key ids toward hasActorIds — a page with only those still needs one lookup', () => {
    expect(hasActorIds(ids({ apiKeys: ['key_live'] }))).toBe(true);
  });
});

describe('actorIdsKey', () => {
  it('is order-independent, so two renders that found the same ids share one cache entry', () => {
    expect(actorIdsKey(ids({ users: ['b', 'a'] }))).toBe(actorIdsKey(ids({ users: ['a', 'b'] })));
  });

  it('still separates genuinely different batches', () => {
    expect(actorIdsKey(ids({ users: ['a'] }))).not.toBe(actorIdsKey(ids({ accounts: ['a'] })));
    // Including the kind the fourth list added: the same id under a different kind is a different
    // request, and sharing a cache entry would serve one kind's labels for the other's rows.
    expect(actorIdsKey(ids({ apiKeys: ['a'] }))).not.toBe(actorIdsKey(ids({ projects: ['a'] })));
  });
});

// ── lightbridge-authz#674: `resolveActorLabels` is gated per kind ──

describe('apiKeyIdsOnly', () => {
  it('keeps the API-key ids and drops the three kinds that need user:read', () => {
    expect(
      apiKeyIdsOnly(
        ids({
          users: ['usr_1'],
          accounts: ['acct_1'],
          projects: ['proj_1'],
          apiKeys: ['key_live'],
        })
      )
    ).toEqual(ids({ apiKeys: ['key_live'] }));
  });

  it('leaves a caller with nothing to ask when the page had no API keys — not a request that 403s', () => {
    expect(hasActorIds(apiKeyIdsOnly(ids({ users: ['usr_1'] })))).toBe(false);
  });
});

describe('buildLabelFor', () => {
  const labelFor = buildLabelFor(labels);

  it('shows a user as name over email — the owner-confirmed shape', () => {
    expect(labelFor('user', 'usr_1')).toEqual({
      label: 'Ada Lovelace',
      secondary: 'ada@example.com',
      subtle: false,
    });
  });

  it('promotes the email to the label when there is no display name — an email IS an identity', () => {
    const resolved = labelFor('user', 'usr_email_only');
    expect(resolved.label).toBe('grace@example.com');
    // Not repeated underneath itself.
    expect(resolved.secondary).toBeUndefined();
  });

  it('falls back to the labelled sentinel for a row with neither name nor email', () => {
    expect(labelFor('user', 'usr_bare').label).toBe('usr_bare');
  });

  it('carries an account owner and a project parent, because "Production" is not distinguishing', () => {
    expect(labelFor('account', 'acct_1')).toMatchObject({ label: 'Production' });
    expect(labelFor('account', 'acct_1').secondary).toContain('usr_1');
    expect(labelFor('project', 'proj_1')).toMatchObject({
      label: 'Ingest',
      secondary: 'in Production',
    });
  });

  it('never fabricates an identity — an unresolved id keeps its own sentinel', () => {
    expect(labelFor('user', 'usr_missing')).toEqual({ label: 'usr_missing', subtle: false });
    expect(labelFor('user', 'missing:github:preferred_username')).toEqual({
      label: 'Unidentified — GitHub',
      secondary: undefined,
      subtle: true,
    });
  });

  it('names an API key, with its project as the second line', () => {
    expect(labelFor('api_key', 'key_live')).toEqual({
      label: 'Production ingest',
      // The PROJECT, not the account: two keys called "ingest" in one account are told apart by
      // the project, which is also the scope a person manages keys in.
      secondary: 'in Ingest',
      subtle: false,
    });
  });

  it('marks a revoked key on the LABEL, and keeps its name', () => {
    // The spend a revoked key drew is real and still has to be attributable to something a person
    // recognises — so it is never demoted to a sentinel, and the second line stays the parent.
    expect(labelFor('api_key', 'key_dead')).toMatchObject({
      label: 'Retired loader (revoked)',
      secondary: 'in Ingest',
    });
  });

  it('falls back to the project ID when the project itself was not in the batch', () => {
    // Which happens on every page read by someone without `user:read`: their batch carries API-key
    // ids only, so the parent project has no label to borrow. The id is the honest second line.
    expect(labelFor('api_key', 'key_orphan').secondary).toBe('in proj_unresolved');
  });

  it('degrades to sentinels-only when the lookup produced nothing at all', () => {
    const none = buildLabelFor(undefined);
    expect(none('user', 'usr_1')).toEqual(IDENTITY_LABEL_FOR('user', 'usr_1'));
  });
});

// ── Story C6 (converse-frontends#449): the page's own subject id joins the same batch ──

describe('withSeedActorIds / actorIdsOf', () => {
  it('names exactly one actor, in the list its kind belongs to', () => {
    expect(actorIdsOf('user', 'usr_1')).toEqual(ids({ users: ['usr_1'] }));
    expect(actorIdsOf('account', 'acct_1').accounts).toEqual(['acct_1']);
    expect(actorIdsOf('project', 'proj_1').projects).toEqual(['proj_1']);
    expect(actorIdsOf('api_key', 'key_live').apiKeys).toEqual(['key_live']);
  });

  /** The page's subject leads: it is the one id whose absence would leave the header titled after
   *  a cuid, so the batch cap must never be what drops it. */
  it('puts the seed FIRST, ahead of everything the responses carried', () => {
    const merged = withSeedActorIds(
      actorIdsOf('user', 'usr_seed'),
      ids({ users: ['usr_a', 'usr_b'], accounts: ['acct_a'] })
    );
    expect(merged.users).toEqual(['usr_seed', 'usr_a', 'usr_b']);
    // Untouched kinds pass straight through.
    expect(merged.accounts).toEqual(['acct_a']);
  });

  it('folds a seed the responses also carried instead of asking about it twice', () => {
    const merged = withSeedActorIds(
      actorIdsOf('user', 'usr_a'),
      ids({ users: ['usr_a', 'usr_b'] })
    );
    expect(merged.users).toEqual(['usr_a', 'usr_b']);
  });

  it('keeps the batch inside the procedure’s own cap, seed included', () => {
    const collected = Array.from({ length: ACTOR_ID_BATCH_CAP }, (_, i) => `usr_${i}`);
    const merged = withSeedActorIds(actorIdsOf('user', 'usr_seed'), ids({ users: collected }));
    expect(merged.users).toHaveLength(ACTOR_ID_BATCH_CAP);
    expect(merged.users[0]).toBe('usr_seed');
  });

  it('is a no-op for a page with no subject of its own', () => {
    const collected = ids({ users: ['usr_a'] });
    expect(withSeedActorIds(undefined, collected)).toBe(collected);
  });
});
