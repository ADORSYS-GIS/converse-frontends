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
 *
 * **Admin fast path (converse-frontends#368, "not just the one the user is bound to"):** an
 * `account`-scoped query from a session carrying `lightbridge-admin` bypasses the ownership
 * predicate entirely, mirroring `getBudgetBalance`/`listBudgetGrants` — the schema's own admin
 * budget-read pair (`authz.cstack:1479-1482,1541-1544`), gated purely on the coarse RBAC
 * permission with NO per-tenant `@@allow` ownership predicate, "since there is no per-tenant
 * `@@allow` predicate that could express 'budgetAccountId belongs to auth().id' here." The usage
 * backend has the identical shape of gap: it authenticates the PROXY via mTLS client cert, not
 * the end caller, so this guard is the entire per-account authorization story for
 * `scope: 'account'` (see this route's own doc comment) — same as the budget pair, a coarse
 * role check is the correct (and only available) substitute for a per-tenant predicate that
 * cannot be expressed here either.
 *
 * **Widened to `user` and `project` too (converse-frontends#448 / lightbridge-authz#648, PR
 * #652).** The backend's own `query_usage` now reads: a token holding `Permission::UsageReadAll`
 * "may read ANY `scope_id` under `user`/`project`/`account`. Without it those three scopes are
 * strictly WIDER than `all` is narrow: `scope=all` already returns every row in the estate to this
 * exact permission." This guard mirrors that exactly, and had to: `/admin/usage/actors/<id>` is a
 * single actor's slice of data the SAME session can already fetch wholesale through `scope: all`,
 * so refusing it here would protect nothing while forcing the console to download the estate and
 * filter it in the browser. The `project` note below (about `model.Project.read` having no admin
 * bypass) applies to the authz-api RPC path, not to this usage endpoint, whose sole backend
 * authority is the permission check quoted above.
 *
 * **`api_key` is NOT widened, for admins or anyone.** The backend refuses that scope
 * unconditionally — it has no resolvable ownership authority at all — so accepting it here would
 * produce a guard pass immediately followed by a backend `403`: dishonest, not merely redundant.
 *
 * `isAdmin` MUST be computed server-side from the decrypted session cookie's own
 * `user.roles` (`tokens.ts`'s `isAdmin(session.user.roles)`, the identical check
 * `app/(console)/admin/overview/page.tsx` already gates the route itself with) — never from a
 * client-supplied header or body field. `route.ts` is the only caller and passes exactly that.
 * Omitted (`undefined`) is treated as `false` — the non-admin path is completely unchanged: it
 * still resolves and checks real ownership, so a caller who somehow reached this guard without a
 * verified role claim gets the pre-existing, unmodified behavior.
 *
 * **`scope: 'all'` (lightbridge-authz#605, the `/admin/overview` estate data path):** accepted
 * ONLY alongside `isAdmin === true`, via its own fast path below — mirroring the `scope: 'account'`
 * admin fast path, since "all" has no per-account ownership predicate to check even in principle.
 * A non-admin `scope: 'all'` request is refused by the existing generic `isScopeOwned` fallthrough
 * (no arm exists for `'all'`, so it fails closed exactly like an unrecognised scope kind). Unlike
 * every other scope this guard reasons about, the BACKEND now independently enforces this one too
 * — `Permission::UsageReadAll` (`usage:read-all`), read directly off the bearer token, granted to
 * `lightbridge-admin` by that role's default `*` grant — so this client-side check is genuinely
 * defense-in-depth here, not the sole authorization story the way it is for `scope: 'account'`
 * (whose backend authority is only the mTLS-authenticated proxy, per the admin-fast-path note
 * above).
 *
 * A NON-admin caller's path is completely unchanged by any of the above: `account` and `project`
 * still resolve real ownership through `resolveOwnedAccountIds`/`resolveProjectAccountId`, and
 * `user`/`api_key`/`all` still fail closed in `isScopeOwned`, which has no arm for them.
 */

/**
 * The scopes a `lightbridge-admin` session may name ANY `scope_id` under, mirroring the backend's
 * own `usage:read-all` rule verbatim (`handlers::query::query_usage`, lightbridge-authz PR #652).
 *
 * `all` is not in this set because it is handled by its own fast path below (it has no `scope_id`
 * at all), and `api_key` is not in it because the backend refuses that scope unconditionally for
 * every caller — an admin included. Stated as a closed set rather than an `||` chain so
 * "which scopes does admin unlock" has exactly one answer a test can read.
 */
const ADMIN_READABLE_SCOPES: ReadonlySet<string> = new Set(['user', 'project', 'account']);

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
  if (typeof scopeId !== 'string') return null;
  // `scope: 'all'` is the one scope kind whose `scope_id` is required-but-IGNORED on the wire
  // (`openapi/usage.backend.yaml`'s own `UsageScope`/`scope_id` descriptions, mirroring
  // lightbridge-authz#605): an estate-wide query has no single id it is "about," so the console
  // sends `""` for it, same as the backend documents — that must not be rejected here as
  // malformed. Every other scope keeps requiring a genuinely non-empty `scope_id`.
  if (scope !== 'all' && scopeId.length === 0) return null;
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
  resolveProjectAccountId: ResolveProjectAccountId,
  homeAccountId?: string,
  isAdmin?: boolean
): Promise<UsageScopeGuardOutcome> {
  const parsed = parseUsageScopeRequest(rawBody);
  if (!parsed) {
    return { ok: false, status: 400, error: 'invalid_body' };
  }

  // ── Fast path (owner directive, 2026-08-30): the session's own `sub` IS the home-account id
  // (ADR-0025 mints it so; ADR-0026 keeps it as the ownership anchor), so an account-scoped
  // query for the caller's OWN home account needs no authz round-trip at all — approving it from
  // the session alone keeps the common case free of the server-side CBOR path whose packaging
  // caused the 2026-08-30 usage outage. Child accounts (minted cuid ids) and project scopes
  // still resolve through authz below; a mismatched sub falls through to the slow path, never
  // to a refusal here.
  if (homeAccountId && parsed.scope === 'account' && parsed.scopeId === homeAccountId) {
    return { ok: true };
  }

  // ── Admin fast path (converse-frontends#368, widened for `user`/`project` by #448) — see this
  // function's own doc comment above for why a role bypass, not a wider per-tenant predicate, is
  // the correct mirror of the backend's own rule. These are EXACTLY the three scopes
  // `handlers::query::query_usage` lets a `usage:read-all` holder read any `scope_id` under;
  // `api_key` is deliberately absent, because the backend refuses it for every caller.
  // `isAdmin` is trusted here BECAUSE the caller (`route.ts`) is contractually required to derive
  // it from the decrypted session cookie, never from request input — this function has no way to
  // re-verify that itself, the same trust boundary `homeAccountId` above already relies on.
  if (isAdmin === true && ADMIN_READABLE_SCOPES.has(parsed.scope)) {
    return { ok: true };
  }

  // ── Admin scope=all fast path (lightbridge-authz#605, the /admin/overview estate data path) —
  // `scope: 'all'` is the backend's own estate-wide query kind: no entity filter at all, so there
  // is no per-account ownership predicate to check for it, by definition — same reasoning as the
  // `scope: 'account'` admin fast path immediately above, applied to the one scope where even a
  // per-tenant predicate could never exist. The backend now independently enforces this too
  // (`Permission::UsageReadAll`/`usage:read-all`, granted to `lightbridge-admin`) — this guard is
  // defense-in-depth, not the sole gate, matching `usage-scope-guard.ts`'s own doc comment: this
  // module closes a gap in what `proxyRequest` forwards, and the backend is the actual authority.
  // A non-admin `scope: 'all'` request falls through unchanged to `isScopeOwned` below, which has
  // no arm for `'all'` and fails closed exactly like `'user'`/`'api_key'` already do.
  if (isAdmin === true && parsed.scope === 'all') {
    return { ok: true };
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
