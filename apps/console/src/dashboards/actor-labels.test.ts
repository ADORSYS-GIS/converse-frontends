import type { UsageQueryResponse, UsageSeriesPoint } from '@lightbridge/api-rest';
import type { ActorLabels } from '@lightbridge/authz-rpc';
import { describe, expect, it } from 'vitest';

import { UNASSIGNED_KEY } from '../containers/overview-usage';
import {
  ACTOR_ID_BATCH_CAP,
  actorIdsKey,
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
};

describe('collectActorIds', () => {
  it('gathers all three kinds across every response, in one batch', () => {
    const ids = collectActorIds([
      response([point({ user_id: 'usr_1' }), point({ account_id: 'acct_1' })]),
      response([point({ project_id: 'proj_1' })]),
      undefined,
    ]);
    expect(ids).toEqual({ users: ['usr_1'], accounts: ['acct_1'], projects: ['proj_1'] });
  });

  it('orders by the requests each id carries, so the cap keeps what matters', () => {
    const ids = collectActorIds([
      response([
        point({ user_id: 'quiet', requests: 1 }),
        point({ user_id: 'busy', requests: 900 }),
        point({ user_id: 'quiet', requests: 1 }),
      ]),
    ]);
    expect(ids.users).toEqual(['busy', 'quiet']);
  });

  it('caps each list independently at the procedure own limit — it REJECTS a longer batch', () => {
    const many = Array.from({ length: ACTOR_ID_BATCH_CAP + 50 }, (_, i) =>
      point({ user_id: `usr_${i}`, requests: ACTOR_ID_BATCH_CAP + 50 - i })
    );
    const ids = collectActorIds([response(many)]);
    expect(ids.users).toHaveLength(ACTOR_ID_BATCH_CAP);
    // Highest-traffic first, so the ones an operator is looking at survive the cap.
    expect(ids.users[0]).toBe('usr_0');
  });

  it('never asks the backend to resolve the Unassigned sentinel or an empty id', () => {
    const ids = collectActorIds([
      response([point({ user_id: UNASSIGNED_KEY }), point({ account_id: '' })]),
    ]);
    expect(ids).toEqual({ users: [], accounts: [], projects: [] });
  });

  it('is empty, not undefined, for an empty page — all three lists are required by the RPC', () => {
    expect(collectActorIds([])).toEqual({ users: [], accounts: [], projects: [] });
    expect(hasActorIds(collectActorIds([]))).toBe(false);
  });
});

describe('actorIdsKey', () => {
  it('is order-independent, so two renders that found the same ids share one cache entry', () => {
    const a = { users: ['b', 'a'], accounts: [], projects: [] };
    const b = { users: ['a', 'b'], accounts: [], projects: [] };
    expect(actorIdsKey(a)).toBe(actorIdsKey(b));
  });

  it('still separates genuinely different batches', () => {
    expect(actorIdsKey({ users: ['a'], accounts: [], projects: [] })).not.toBe(
      actorIdsKey({ users: [], accounts: ['a'], projects: [] })
    );
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

  it('degrades to sentinels-only when the lookup produced nothing at all', () => {
    const none = buildLabelFor(undefined);
    expect(none('user', 'usr_1')).toEqual(IDENTITY_LABEL_FOR('user', 'usr_1'));
  });
});

// ── Story C6 (converse-frontends#449): the page's own subject id joins the same batch ──

describe('withSeedActorIds / actorIdsOf', () => {
  it('names exactly one actor, in the list its kind belongs to', () => {
    expect(actorIdsOf('user', 'usr_1')).toEqual({
      users: ['usr_1'],
      accounts: [],
      projects: [],
    });
    expect(actorIdsOf('account', 'acct_1').accounts).toEqual(['acct_1']);
    expect(actorIdsOf('project', 'proj_1').projects).toEqual(['proj_1']);
  });

  /** The page's subject leads: it is the one id whose absence would leave the header titled after
   *  a cuid, so the batch cap must never be what drops it. */
  it('puts the seed FIRST, ahead of everything the responses carried', () => {
    const merged = withSeedActorIds(actorIdsOf('user', 'usr_seed'), {
      users: ['usr_a', 'usr_b'],
      accounts: ['acct_a'],
      projects: [],
    });
    expect(merged.users).toEqual(['usr_seed', 'usr_a', 'usr_b']);
    // Untouched kinds pass straight through.
    expect(merged.accounts).toEqual(['acct_a']);
  });

  it('folds a seed the responses also carried instead of asking about it twice', () => {
    const merged = withSeedActorIds(actorIdsOf('user', 'usr_a'), {
      users: ['usr_a', 'usr_b'],
      accounts: [],
      projects: [],
    });
    expect(merged.users).toEqual(['usr_a', 'usr_b']);
  });

  it('keeps the batch inside the procedure’s own cap, seed included', () => {
    const collected = Array.from({ length: ACTOR_ID_BATCH_CAP }, (_, i) => `usr_${i}`);
    const merged = withSeedActorIds(actorIdsOf('user', 'usr_seed'), {
      users: collected,
      accounts: [],
      projects: [],
    });
    expect(merged.users).toHaveLength(ACTOR_ID_BATCH_CAP);
    expect(merged.users[0]).toBe('usr_seed');
  });

  it('is a no-op for a page with no subject of its own', () => {
    const collected = { users: ['usr_a'], accounts: [], projects: [] };
    expect(withSeedActorIds(undefined, collected)).toBe(collected);
  });
});
