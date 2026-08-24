import { describe, expect, it } from 'vitest';

import { SPEC_ACCENT, SPEC_GREY_RAMP, specSeriesColor } from './chart-tokens';

describe('specSeriesColor', () => {
  it('cycles through the spec ramp in fixed order for unselected, unbreached series', () => {
    expect(specSeriesColor(0)).toBe(SPEC_GREY_RAMP[0]);
    expect(specSeriesColor(1)).toBe(SPEC_GREY_RAMP[1]);
    expect(specSeriesColor(2)).toBe(SPEC_GREY_RAMP[2]);
  });

  it('clamps chart-core rank 4+ onto the spec ramp\'s last (--line) step', () => {
    // chart-core's GREY_RAMP has 5 steps; the spec's has 4 ("rank 4+" per §2.4).
    expect(specSeriesColor(3)).toBe(SPEC_GREY_RAMP[3]);
    expect(specSeriesColor(4)).toBe(SPEC_GREY_RAMP[3]);
  });

  it('cycles chart-core-side (mod 5) back to the spec ramp start at index 5', () => {
    expect(specSeriesColor(5)).toBe(SPEC_GREY_RAMP[0]);
  });

  it('never returns a spec ramp colour when selected or breached', () => {
    for (let i = 0; i < 8; i += 1) {
      expect(specSeriesColor(i, { selected: true })).toBe(SPEC_ACCENT);
      expect(specSeriesColor(i, { breached: true })).toBe(SPEC_ACCENT);
    }
  });

  it('the spec accent is identical to chart-core\'s CHART_ACCENT (#DA5C2C), no divergence', () => {
    expect(SPEC_ACCENT).toBe('#DA5C2C');
  });

  it('handles a negative index without throwing', () => {
    expect(() => specSeriesColor(-1)).not.toThrow();
    expect(SPEC_GREY_RAMP as readonly string[]).toContain(specSeriesColor(-1));
  });
});
