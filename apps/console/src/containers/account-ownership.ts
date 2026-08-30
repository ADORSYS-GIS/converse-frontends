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
