import { describe, expect, it } from 'vitest';

import { PRINT_CHART_PALETTE, resolveCssVariables } from './print-palette';

describe('resolveCssVariables', () => {
  it('substitutes every chart token a rendered SVG can carry', () => {
    const svg =
      '<svg><path fill="var(--chart-rank-1)" stroke="var(--color-muted)"/>' +
      '<text fill="var(--color-subtle)">$1.00</text></svg>';

    const resolved = resolveCssVariables(svg);

    expect(resolved).toContain('fill="#363636"');
    expect(resolved).toContain('stroke="#ffffff"');
    expect(resolved).toContain('fill="#6b6b6b"');
    expect(resolved).not.toContain('var(');
  });

  it('THROWS on a token with no print value rather than leaving an invisible mark', () => {
    // The failure this guards against is the worst one a report can have: an unresolved `var()`
    // renders as nothing, and a chart that draws nothing reads as "there was no data".
    expect(() => resolveCssVariables('<svg><path fill="var(--color-brand-new)"/></svg>')).toThrow(
      /--color-brand-new/
    );
  });

  it('leaves an SVG with no variables untouched', () => {
    const svg = '<svg><rect fill="#000000"/></svg>';
    expect(resolveCssVariables(svg)).toBe(svg);
  });

  it('is a light palette — a report is read on paper, not in the app’s dark theme', () => {
    expect(PRINT_CHART_PALETTE['--color-ink']).toBe('#1a1a1a');
    expect(PRINT_CHART_PALETTE['--color-surface']).toBe('#ffffff');
    // The floor is whitened relative to `wireframe`'s `#ebebeb`: the point-marker cut-out sits on
    // a white page here, and `#ebebeb` would draw a faint halo around every marker.
    expect(PRINT_CHART_PALETTE['--color-muted']).toBe('#ffffff');
  });
});
