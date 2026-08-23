import { describe, expect, it } from 'vitest';

import { CHART_ACCENT, DASH_PATTERNS, GREY_RAMP, seriesColor, seriesDash } from './colors';

describe('seriesColor', () => {
  it('cycles through the grey ramp in fixed order for unselected, unbreached series', () => {
    expect(seriesColor(0)).toBe(GREY_RAMP[0]);
    expect(seriesColor(1)).toBe(GREY_RAMP[1]);
    expect(seriesColor(GREY_RAMP.length)).toBe(GREY_RAMP[0]);
  });

  it('never returns the accent unless selected or breached', () => {
    for (let i = 0; i < 12; i += 1) {
      expect(seriesColor(i)).not.toBe(CHART_ACCENT);
    }
  });

  it('returns the accent when selected, regardless of slot', () => {
    expect(seriesColor(3, { selected: true })).toBe(CHART_ACCENT);
  });

  it('returns the accent when breached, regardless of slot', () => {
    expect(seriesColor(3, { breached: true })).toBe(CHART_ACCENT);
  });

  it('handles a negative index without throwing (defensive against a mis-tracked index)', () => {
    expect(() => seriesColor(-1)).not.toThrow();
    expect(GREY_RAMP as readonly string[]).toContain(seriesColor(-1));
  });
});

describe('seriesDash', () => {
  it('index 0 is solid, so the common single-series case draws a plain line', () => {
    expect(seriesDash(0)).toBe('');
  });

  it('cycles through distinct dash patterns for subsequent series', () => {
    const seen = new Set(Array.from({ length: DASH_PATTERNS.length }, (_, i) => seriesDash(i)));
    expect(seen.size).toBe(DASH_PATTERNS.length);
  });
});
