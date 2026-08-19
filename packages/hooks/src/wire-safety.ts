/**
 * Pure, dependency-free guard for values that cross the generated RPC client's `unknown`-typed
 * decode boundary (`packages/authz-rpc/generated/src/client.ts`'s `.then((value) =>
 * reviveDecimalFields(value, ShapeName) as T)` — an unchecked cast, not a runtime validation, for
 * every model/procedure response). A field's TypeScript type (e.g. `string | null`) is the
 * *compile-time* contract only; nothing on this boundary actually checks that the decoded CBOR/JSON
 * value matches it before the cast, so a server bug, a client/server schema version skew, or a
 * malformed response in transit can hand a call site a value whose real runtime type doesn't match
 * what TypeScript believes.
 *
 * Confirmed twice on optional-string RPC fields consumed with an unguarded `.trim()`: first
 * `ApiKeySecret.oauth2Url` in `OneTimeSecretCard` (fixed locally there with a `typeof` check — see
 * `apps/self-service/src/components/one-time-secret-card.tsx`'s `normalizeOauth2Url`), then
 * `Account.defaultQuota` in `AccountSettingsView` (`TypeError: f.trim is not a function`,
 * production incident). `?.`/`??` only guard `null`/`undefined` — a present non-string value (a
 * number, boolean, array, or object) sails straight through either and still crashes on `.trim()`.
 * Two independent sites hitting the identical shape is a systemic gap at the RPC boundary, not two
 * unrelated bugs, so this guard belongs in one shared place every such call site can reach for,
 * rather than being reinvented (or, worse, left out) at the next one.
 *
 * Deliberately NOT re-exported from `@lightbridge/hooks`'s main barrel (`./index.ts`) — that barrel
 * pulls in `@lightbridge/authz-rpc`, whose `codec.ts` imports `cborg`, which Jest's resolver cannot
 * follow (`./budget-tiers.ts` hit this exact issue first; see its own module doc comment). This
 * module has zero dependencies of its own, so it stays reachable as its own subpath
 * (`@lightbridge/hooks/wire-safety`, see `package.json`'s `exports` map) precisely so a
 * presentational view component can import it without ever pulling `cborg` into a Jest run.
 */
export function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Like {@link asTrimmedString}, but preserves a genuine absence (`null`/`undefined`) as `null`
 * instead of collapsing it to `''` — for call sites that need to tell "field not set" apart from
 * "field set to an empty string" (e.g. deciding whether to render something at all), while still
 * refusing to trust a present-but-wrong-typed value.
 */
export function asTrimmedStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return typeof value === 'string' ? value.trim() : null;
}
