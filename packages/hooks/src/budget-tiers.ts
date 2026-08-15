/**
 * Pure, dependency-free budget helpers (tier ladder, dollar formatting, error-status extraction).
 * Deliberately split out of `./budget.ts`: that file also defines the mutation/query hooks, which
 * import `@lightbridge/authz-rpc` at the top level -- and that package's `codec.ts` imports
 * `cborg`, whose package.json `exports` map Jest's resolver cannot follow (fails with "Cannot
 * find module 'cborg'") when this app's Jest config resolves it transitively. `./pagination` and
 * `./use-query-state` already use this same "small dependency-free leaf module + its own package
 * subpath export" pattern for exactly this reason -- a presentational *view* component can import
 * this module directly (`@lightbridge/hooks/budget-tiers`) without ever pulling in
 * `@lightbridge/authz-rpc`, keeping it testable the same way `project-settings-view.test.tsx`
 * tests `ProjectSettingsView` -- no `jest.mock('@lightbridge/hooks', ...)` required.
 */

/**
 * The self-service refill ladder (lightbridge-authz ADR-0008, "refills are discrete budget
 * tiers"). Each entry's wire value is the opaque tier string the backend expects/returns (e.g.
 * `"b-30"`) -- there is no free-text amount anywhere in this domain, by design (ADR-0008's whole
 * point).
 *
 * IMPORTANT: this ladder is the SERVER's decision space, not a client selector. Confirmed by
 * `authz.cstack`'s own comment directly above `RequestBudgetRefillInput`: a caller asks for more
 * budget for `budgetAccountId`/`period`, and `RefillService::request_refill` DECIDES which tier
 * to grant (or queue for review) -- there is deliberately no tier/amount argument anywhere on
 * that input type. `AugmentationRequest.requestedTier` lives on the RESPONSE precisely because
 * it is what the service assigned, not what the caller picked. This module's job is therefore
 * purely a display lookup -- turning the tier the server already chose (e.g. `"b-250"`) into a
 * dollar label (`"$250"`) for the result screen -- never a picker for the user to choose from.
 * The dollar amount below has no server-side representation at all; it is a UI-only convenience
 * table. Keep it in sync with ADR-0008 by hand -- there is nothing on the wire to derive it from.
 */
export const BUDGET_TIERS = ['b-15', 'b-30', 'b-60', 'b-120', 'b-250', 'b-500', 'b-1000'] as const;

export type BudgetTier = (typeof BUDGET_TIERS)[number];

export const BUDGET_TIER_AMOUNT_USD: Record<BudgetTier, number> = {
  'b-15': 15,
  'b-30': 30,
  'b-60': 60,
  'b-120': 120,
  'b-250': 250,
  'b-500': 500,
  'b-1000': 1000,
};

export function isBudgetTier(value: string): value is BudgetTier {
  return (BUDGET_TIERS as readonly string[]).includes(value);
}

/** Formats a tier's UI-only dollar amount, e.g. `formatBudgetTierAmount('b-30') === '$30'`. */
export function formatBudgetTierAmount(tier: BudgetTier): string {
  return `$${BUDGET_TIER_AMOUNT_USD[tier].toLocaleString('en-US')}`;
}

/**
 * Formats a decimal-string micro-USD amount (`requestedAmountMicros`/`approvedAmountMicros`) as
 * a dollar string for display, e.g. `formatMicroUsd('30000000') === '$30.00'`.
 *
 * Deliberately BigInt-based end to end, never `Number()` -- those fields are decimal *strings*
 * specifically because cratestack's TypeScript codegen types the schema's `Int` as a plain JS
 * `number`, lossy above 2^53 (see `authz.cstack`'s own comment on `AugmentationRequest`). This
 * function is display-only; its result must never be sent back to an RPC call -- if a raw
 * micro-USD string needs to travel back to the wire, pass the original string through unchanged.
 */
export function formatMicroUsd(micros: string): string {
  const trimmed = micros.trim();
  const negative = trimmed.startsWith('-');
  const digits = negative ? trimmed.slice(1) : trimmed;

  if (!/^\d+$/.test(digits)) {
    // Unexpected shape -- fail visibly rather than guess.
    return micros;
  }

  const value = BigInt(digits);
  const whole = value / 1_000_000n;
  const fractionMicros = value % 1_000_000n;

  // Round to the nearest cent using only integer arithmetic.
  const centsFloor = fractionMicros / 10_000n;
  const centsRemainder = fractionMicros % 10_000n;
  const roundedUp = centsRemainder * 2n >= 10_000n;
  const cents = roundedUp ? centsFloor + 1n : centsFloor;
  const carries = cents >= 100n;

  const finalWhole = carries ? whole + 1n : whole;
  const finalCents = carries ? cents - 100n : cents;
  const sign = negative ? '-' : '';

  return `${sign}$${finalWhole.toString()}.${finalCents.toString().padStart(2, '0')}`;
}

/** The current calendar month as `'YYYY-MM'` (`lightbridge_authz_budget::Period`'s wire format). */
export function currentBudgetPeriod(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Extracts the HTTP status code from an error thrown by the generated API client, when present.
 * Mirrors `getApiErrorMessage` in `./api-error.ts` but for the status code rather than the
 * message -- needed here specifically to distinguish a `403` (permission denied, not retryable)
 * from any other failure (network/5xx, retryable via the same idempotency key).
 */
export function getApiErrorStatus(error: unknown): number | undefined {
  if (error && typeof error === 'object') {
    const status = (error as { response?: { status?: unknown } }).response?.status;
    if (typeof status === 'number') {
      return status;
    }
  }
  return undefined;
}

export function isPermissionDeniedError(error: unknown): boolean {
  return getApiErrorStatus(error) === 403;
}
