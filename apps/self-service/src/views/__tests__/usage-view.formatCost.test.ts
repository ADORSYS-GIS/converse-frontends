import { formatCost } from '../usage-view';

describe('formatCost', () => {
  it('formats a whole-dollar amount as USD currency', () => {
    expect(formatCost(12)).toBe('$12.00');
  });

  it('keeps up to six fractional digits for sub-cent usage costs', () => {
    expect(formatCost(0.000123)).toBe('$0.000123');
  });

  it('formats zero cost', () => {
    expect(formatCost(0)).toBe('$0.00');
  });
});
