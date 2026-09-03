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
 * fabricated) and says so plainly through `familyTruncationCap` + its caption rather than claiming a ranking
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

/**
 * The cap a page actually truncated at, or `null` when nothing was dropped — so a page never
 * renders a caption apologising for a truncation that did not happen.
 *
 * ADR 0017 turned this from a caption builder into a FACT: the sentence
 * ("Showing the top 25 of 61 accounts.") is copy and lives in `settings:usage-overview.
 * family-truncated`, while whether-and-at-what-number is the only part this module can decide. A
 * pure module returning an English sentence would have been the one string on the page a German
 * reader still met in English.
 */
export function familyTruncationCap(
  totalAccounts: number,
  cap: number = MAX_FANNED_OUT_ACCOUNTS
): number | null {
  return totalAccounts <= cap ? null : cap;
}

/** One account's slice of a fanned-out or estate-wide usage response — the shape
 *  `admin-estate-operations-usage.ts`'s `splitResponseByAccount` produces. */
export interface AccountUsageResponse {
  accountId: string;
  response: UsageQueryResponse;
}
