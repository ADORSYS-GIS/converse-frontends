import { describe, expect, it } from 'vitest';

import { formatBillingPlanLimits } from './billing-plan-limits';

describe('formatBillingPlanLimits', () => {
  it('renders every present field', () => {
    expect(
      formatBillingPlanLimits({
        requestsPerSecond: 2,
        requestsPerDay: 500,
        requestsPerMonth: 10_000,
        concurrentRequests: 4,
      })
    ).toBe('2/s · 500/day · 10000/mo · 4 concurrent');
  });

  it('omits an absent field instead of rendering it as 0', () => {
    expect(formatBillingPlanLimits({ requestsPerSecond: 20, requestsPerDay: undefined })).toBe(
      '20/s'
    );
  });

  it('treats an explicit null field the same as an absent one', () => {
    expect(formatBillingPlanLimits({ requestsPerSecond: 20, requestsPerDay: null })).toBe('20/s');
  });

  it('never coerces a genuinely-zero limit away — 0 is a real value, not "absent"', () => {
    expect(formatBillingPlanLimits({ requestsPerSecond: 0 })).toBe('0/s');
  });

  it('reports no configured limits when every field is absent', () => {
    expect(formatBillingPlanLimits({})).toBe('No configured limits.');
  });

  it('reports no configured limits when limits itself is null', () => {
    expect(formatBillingPlanLimits(null)).toBe('No configured limits.');
  });

  it('reports no configured limits when limits itself is undefined (the enterprise-tier shape)', () => {
    expect(formatBillingPlanLimits(undefined)).toBe('No configured limits.');
  });
});
