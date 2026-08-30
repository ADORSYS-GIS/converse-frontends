/**
 * The shared sentinel labeller for user/account rows (IA v3 phase 4, build brief §6) — placed
 * beside `overview-usage.ts`'s `SeriesLabeller` since it produces the same shape of thing (a key
 * resolved to a human-readable label), for the two dimensions the usage backend's own identity
 * data is genuinely incomplete on: `user_id` (an unauthenticated caller, or one Keycloak/GitHub
 * never returned a `preferred_username` for) and account ids surfaced without a real account name
 * (a bare `-`, or a GitHub-App-style `owner/repo` slug standing in for one).
 *
 * Two known sentinel KEYS the usage backend itself emits when an identity provider's own
 * `preferred_username` claim was absent from the token that produced a usage event — never
 * fabricated by this console, always the literal string the backend already writes.
 */
const KNOWN_SENTINELS: Record<string, string> = {
  'missing:keycloak:preferred_username': 'Unidentified — Keycloak',
  'missing:github:preferred_username': 'Unidentified — GitHub',
};

/** `owner/repo` — the shape a GitHub-App-derived account id can take when no display name was
 *  ever set for it. Labelled as-is (never invented), just de-emphasized. */
const REPO_SLUG_RE = /^[\w.-]+\/[\w.-]+$/;

export interface SentinelLabel {
  label: string;
  /** De-emphasized rendering — `RankedSeriesRow.subtle` reads this directly. */
  subtle: boolean;
}

/**
 * Resolves a user/account row's key to a label + emphasis.
 *
 * `resolvedName`, when given, is a REAL name the caller already looked up (e.g. an account's
 * display name, or a user's own profile name) — it always wins and is never subtle. Absent that,
 * a recognized sentinel key gets its friendly, de-emphasized label; a bare `-` or a repo-slug id
 * is shown as-is but still de-emphasized (a real identity, just not a human-chosen name); anything
 * else falls through to the raw key at full emphasis — the honest "nothing special about this key,
 * but nothing resolved it either" case (the caller failed to look up the name, not the console
 * inventing one).
 */
export function sentinelLabel(key: string, resolvedName?: string | null): SentinelLabel {
  if (resolvedName) return { label: resolvedName, subtle: false };

  const known = KNOWN_SENTINELS[key];
  if (known) return { label: known, subtle: true };

  if (key === '-' || REPO_SLUG_RE.test(key)) {
    return { label: key, subtle: true };
  }

  return { label: key, subtle: false };
}
