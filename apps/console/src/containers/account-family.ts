import type { UsageQueryResponse } from '@lightbridge/api-rest';

/**
 * What "the accounts this identity can see" means to a console page, and the cap that keeps it
 * bounded (converse-frontends#455, story C12).
 *
 * These two declarations are all that survives `usage-overview-usage.ts`, which C12 deleted along
 * with the hand-written estate screen it served. Everything else in that module — the per-account
 * fan-out combiner, the previous-period series builder, the share truncation — is the declarative
 * engine's job now (`resolve-dashboard.ts`'s `scope: family` expansion, `use-dashboard.ts`'s
 * merge, `panel-adapters.ts`'s own comparison and Top-N handling). What is left is the CAP and the
 * caption that states it, because both are facts about a PAGE rather than about a panel: the
 * resolver is handed an already-capped list precisely so it can never silently truncate one.
 */

/**
 * The hard cap on how many accounts a family fan-out ever queries — never one request per account
 * an identity happens to own, which could be arbitrarily large.
 *
 * **Not (yet) a "top 25 BY SPEND" cap.** Ranking 25 accounts by prior-period spend would mean
 * fanning out to ALL of them first, which is the exact explosion this cap exists to avoid. The
 * usage API has no bulk per-account spend summary — filed as `lightbridge-authz#578`. Until it
 * lands, a family page takes the first `MAX_FANNED_OUT_ACCOUNTS` accounts in whatever order
 * `GET /accounts` returns them (real accounts, a real if not spend-ranked selection, never
 * fabricated) and says so plainly through `familyTruncationCaption` rather than claiming a ranking
 * it cannot honestly produce.
 */
export const MAX_FANNED_OUT_ACCOUNTS = 25;

/** The capped id list a `scope: family` page hands the resolver. */
export function familyAccountIds(
  allAccountIds: readonly string[],
  cap: number = MAX_FANNED_OUT_ACCOUNTS
): string[] {
  return allAccountIds.slice(0, cap);
}

/** e.g. "Showing the top 25 of 61 accounts." — `undefined` when nothing was actually dropped, so a
 *  page never renders a caption apologising for a truncation that did not happen. */
export function familyTruncationCaption(
  totalAccounts: number,
  cap: number = MAX_FANNED_OUT_ACCOUNTS
): string | undefined {
  if (totalAccounts <= cap) return undefined;
  return `Showing the top ${cap} of ${totalAccounts} accounts.`;
}

/** One account's slice of a fanned-out or estate-wide usage response — the shape
 *  `admin-estate-operations-usage.ts`'s `splitResponseByAccount` produces. */
export interface AccountUsageResponse {
  accountId: string;
  response: UsageQueryResponse;
}
