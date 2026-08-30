/**
 * The P1 scope-ownership guard for `POST /api/usage/usage/v1/usage/query` (security review, IA v3
 * phase 1).
 *
 * `UsageQueryRequest`'s `scope`/`scope_id` (`openapi/usage.backend.yaml`) name WHOSE data comes
 * back — `account`/`project`/`user`/`api_key`. Before this guard, `server/proxy.ts` forwarded
 * that body verbatim to the usage backend with the CALLER's own bearer token attached: the token
 * proves who is asking, but nothing checked that `scope_id` was an account/project the asker
 * actually owns. `proxyRequest` is a byte-forwarder BY DESIGN and never inspects the payload (see
 * its own doc comment: "What it deliberately does not do: look at the payload") — so a signed-in
 * user of Account A could read Account B's spend simply by editing the request body before it
 * left the browser. This module is what closes that gap, applied only to the one usage-backend
 * path whose response is scoped by an attacker-controlled field at all.
 *
 * This file is the PURE half: the ownership predicate and the request-body parser, both
 * synchronous and free of I/O, so `usage-scope-guard.test.ts` can exercise every branch with
 * hand-written fakes instead of a mocked network call. `route.ts` supplies the async resolvers —
 * which accounts the caller owns, which account a project belongs to — via
 * `server/authz-account-lookup.ts`, which resolves them with a direct, server-side `authz-api`
 * RPC call (never through the browser).
 *
 * **Fails closed, always.** An unrecognised scope kind, an account whose ownership could not be
 * resolved (network failure, RPC error, `not_found`), and a malformed body all reject the
 * request. There is no code path where "couldn't verify" is treated as "allowed."
 */

export type UsageScopeGuardOutcome =
  | { ok: true }
  | { ok: false; status: 400; error: 'invalid_body' }
  | { ok: false; status: 403; error: 'scope_not_owned' };

export type ParsedUsageScopeRequest = { scope: string; scopeId: string };

/**
 * `UsageQueryRequest`'s two ownership-relevant fields, loosely typed on input since the body is
 * browser-supplied JSON. Everything else on the request (`start_time`/`end_time`/`filters`/
 * `group_by`/…) is irrelevant to ownership and untouched by this module. Returns `null` for
 * anything that is not a well-formed `{scope: string, scope_id: string}` pair — the caller turns
 * that into `400 invalid_body`.
 */
export function parseUsageScopeRequest(rawBody: unknown): ParsedUsageScopeRequest | null {
  if (typeof rawBody !== 'object' || rawBody === null) return null;
  const { scope, scope_id: scopeId } = rawBody as Record<string, unknown>;
  if (typeof scope !== 'string' || scope.length === 0) return null;
  if (typeof scopeId !== 'string' || scopeId.length === 0) return null;
  return { scope, scopeId };
}

/**
 * The ownership predicate. `ownedAccountIds` is every account id the caller's own session may
 * legitimately query — resolved server-side from `model.Account.list`, the SAME RPC call that
 * populates the workspace switcher (`use-console-scope.ts`) and is scoped by the backend's own
 * `@@allow` rule to accounts the subject actually owns (`containers/account-ownership.ts`'s own
 * doc comment: "there is no broader visibility than ownership for this model").
 *
 * - `scope: 'account'` — `scope_id` must itself be a member of `ownedAccountIds`.
 * - `scope: 'project'` — `scope_id` names a project, not an account, so ownership is one hop
 *   removed: `projectAccountId` (resolved by `model.Project.get`) must be a member of
 *   `ownedAccountIds`. `null`/`undefined` (project not found, no permission to see it, or the
 *   lookup itself failing) fails closed.
 * - anything else (`user`, `api_key`, or a scope kind the enum doesn't even define yet) — no
 *   ownership resolution exists for these today, so they fail closed rather than being silently
 *   accepted. Narrowing this is a follow-up once a real resolution path exists for them, not a
 *   reason to open the gate now.
 */
export function isScopeOwned(
  scope: string,
  scopeId: string,
  ownedAccountIds: ReadonlySet<string>,
  projectAccountId: string | null | undefined
): boolean {
  if (scope === 'account') return ownedAccountIds.has(scopeId);
  if (scope === 'project') return projectAccountId != null && ownedAccountIds.has(projectAccountId);
  return false;
}

/** Resolves every account id the caller's session may query. `null` means the resolution itself
 *  failed (network/RPC error) — distinct from a genuinely empty list — so the guard can fail
 *  closed on either. */
export type ResolveOwnedAccountIds = () => Promise<ReadonlySet<string> | null>;

/** Resolves the account id a project belongs to. `null` covers "not found," "no permission to
 *  even see it," and "the lookup itself failed" alike — all three fail closed identically in
 *  `isScopeOwned`. */
export type ResolveProjectAccountId = (projectId: string) => Promise<string | null>;

/**
 * Composes the pure predicate above with the two async resolvers into the full guard outcome.
 * `route.ts` is the only production caller; kept here, rather than inlined in the route, so
 * `usage-scope-guard.test.ts` can drive it with hand-written resolver fakes instead of a mocked
 * network call.
 */
export async function guardUsageScope(
  rawBody: unknown,
  resolveOwnedAccountIds: ResolveOwnedAccountIds,
  resolveProjectAccountId: ResolveProjectAccountId
): Promise<UsageScopeGuardOutcome> {
  const parsed = parseUsageScopeRequest(rawBody);
  if (!parsed) {
    return { ok: false, status: 400, error: 'invalid_body' };
  }

  const ownedAccountIds = await resolveOwnedAccountIds();
  if (ownedAccountIds === null) {
    return { ok: false, status: 403, error: 'scope_not_owned' };
  }

  const projectAccountId =
    parsed.scope === 'project' ? await resolveProjectAccountId(parsed.scopeId) : undefined;

  if (!isScopeOwned(parsed.scope, parsed.scopeId, ownedAccountIds, projectAccountId)) {
    return { ok: false, status: 403, error: 'scope_not_owned' };
  }
  return { ok: true };
}
