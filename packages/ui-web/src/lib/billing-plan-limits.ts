// Formats `BillingPlanInfo.limits` (`packages/authz-rpc/schema/authz.cstack:566` — the
// `listBillingPlans` catalogue procedure's own doc comment) for the create-key form's plan
// selector. That comment is explicit: "an absent field there means 'no limit' ... and stays
// absent here rather than being coerced to a sentinel." This helper is the one place that
// contract gets rendered as text, so it is the one place that could get it wrong — every field
// check below is `!= null` (catches both `undefined` and an explicit `null`), never a fallback to
// `0`, which would silently claim a hard limit of zero requests where the operator configured
// none at all.

export type BillingPlanLimits = {
  requestsPerSecond?: number | null;
  requestsPerDay?: number | null;
  requestsPerMonth?: number | null;
  concurrentRequests?: number | null;
};

const NO_LIMITS_TEXT = 'No configured limits.';

/** `"2/s · 500/day"` for whatever fields are present; `"No configured limits."` when none are. */
export function formatBillingPlanLimits(limits: BillingPlanLimits | null | undefined): string {
  if (!limits) return NO_LIMITS_TEXT;

  const parts: string[] = [];
  if (limits.requestsPerSecond != null) parts.push(`${limits.requestsPerSecond}/s`);
  if (limits.requestsPerDay != null) parts.push(`${limits.requestsPerDay}/day`);
  if (limits.requestsPerMonth != null) parts.push(`${limits.requestsPerMonth}/mo`);
  if (limits.concurrentRequests != null) parts.push(`${limits.concurrentRequests} concurrent`);

  return parts.length > 0 ? parts.join(' · ') : NO_LIMITS_TEXT;
}
