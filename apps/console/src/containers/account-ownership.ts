import type { Account } from '@lightbridge/authz-rpc';

import type { SessionResponse } from '../shared/session-response';

/**
 * ADR-0026's ownership rule (lightbridge-authz#564), applied everywhere the console needs to know
 * whether the signed-in identity owns a given account: `X.userId === session.user.sub`.
 *
 * **Not** `X.id === session.user.sub` — that shortcut only ever held because, before ADR-0026, an
 * identity could hold exactly one account and that account's `id` WAS the subject. It still holds
 * for a person's HOME account (the one `federated_identities` adopts — `id == subject == userId`,
 * see `Account.userId`'s own "LOAD-BEARING INVARIANT" comment in `authz.cstack`), but a SECOND
 * account gets a minted CUID2 `id` while it INHERITS the owner's `userId`, so comparing `id`
 * against `sub` reports a perfectly-owned second account as somebody else's. Every ownership gate
 * in this app funnels through this one function so that mistake can only be made once.
 */
export function isAccountOwner(
  account: Pick<Account, 'userId'> | null | undefined,
  session: SessionResponse
): boolean {
  return account != null && session.user != null && account.userId === session.user.sub;
}

/**
 * `isAccountOwner`, for the call sites that only have an account **id** in hand (e.g.
 * `scope.value.accountId`, a plain string from the URL) rather than the `Account` row itself —
 * looks the row up in `allAccounts` (`useConsoleScope()`) and defers to `isAccountOwner`.
 *
 * `allAccounts` is already the backend's own answer to "which accounts can this identity read at
 * all" (`authz.cstack`'s `@@allow("read", (userId == auth().id) ...)` on `Account`) — there is no
 * broader visibility than ownership for this model, so a hit here is already proof of ownership.
 * Going through `isAccountOwner` anyway (rather than treating "found" as the whole answer) keeps
 * the ADR-0026 rule stated in exactly one place, and stays correct even if that visibility rule
 * ever loosens.
 */
export function isOwnedAccountId(
  accountId: string,
  allAccounts: readonly Pick<Account, 'id' | 'userId'>[],
  session: SessionResponse
): boolean {
  const account = allAccounts.find((candidate) => candidate.id === accountId);
  return isAccountOwner(account, session);
}

/**
 * Is `accountId` the signed-in identity's **home** account — the one `federated_identities`
 * adopted, where `id === subject === userId` (`Account.userId`'s "LOAD-BEARING INVARIANT" comment
 * in `authz.cstack`)? This is a NARROWER question than `isAccountOwner`/`isOwnedAccountId`: every
 * account an identity owns (home or a later, minted-id second account) passes ownership, but only
 * the home account's `id` equals `auth().id`.
 *
 * That distinction is load-bearing for the self-service budget domain (Phase 2d account-scoping
 * audit, converse-frontends#368): `getMyBudgetBalance`/`getMyBudgetRefillLadder`
 * (`authz.cstack:1291,1471`) take no target account at all — they always answer for `auth().id`,
 * i.e. the caller's home account, by construction. There is currently no `budget:read-own`-gated
 * way to ask either question about a second, non-home account (the admin equivalents,
 * `getBudgetBalance`/`getBudgetPolicyStatus`, need the operator-only `budget:read` permission a
 * plain second-account owner does not hold) — see lightbridge-authz#577, the backend gap filed
 * from this audit. Every call site that reads the budget domain for
 * `scope.value.accountId` must check this first and render an honest gap instead of silently
 * showing the home account's numbers under a different account's label.
 */
export function isHomeAccount(accountId: string, session: SessionResponse): boolean {
  return session.user != null && accountId === session.user.sub;
}
