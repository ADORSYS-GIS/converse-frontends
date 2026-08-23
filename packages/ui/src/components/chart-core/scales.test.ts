import { describe, expect, it } from 'vitest';

import {
  innerHeight,
  innerWidth,
  makeBandScale,
  makeLinearScale,
  widenDegenerateDomain,
} from './scales';

describe('widenDegenerateDomain', () => {
  it('leaves a real range untouched', () => {
    expect(widenDegenerateDomain([0, 10])).toEqual([0, 10]);
  });

  it('widens a single-point-at-zero domain (an all-zero-values chart)', () => {
    expect(widenDegenerateDomain([0, 0])).toEqual([0, 1]);
  });

  it('widens a single-point-away-from-zero domain (a single-data-point chart) symmetrically', () => {
    const [lo, hi] = widenDegenerateDomain([50, 50]);
    expect(lo).toBeLessThan(50);
    expect(hi).toBeGreaterThan(50);
    expect(50 - lo).toBeCloseTo(hi - 50);
  });
});

describe('makeLinearScale', () => {
  it('never collapses a degenerate domain to a single output pixel', () => {
    const scale = makeLinearScale([7, 7], [0, 100]);
    expect(scale(7)).toBeGreaterThan(0);
    expect(scale(7)).toBeLessThan(100);
  });

  it('maps the domain endpoints to the range endpoints for a real range', () => {
    const scale = makeLinearScale([0, 10], [200, 0], { nice: false });
    expect(scale(0)).toBe(200);
    expect(scale(10)).toBe(0);
  });
});

describe('makeBandScale', () => {
  it('gives every category a positive bandwidth, even a single category', () => {
    const scale = makeBandScale(['only'], [0, 240]);
    expect(scale.bandwidth()).toBeGreaterThan(0);
  });

  it('spaces categories left to right in domain order', () => {
    const scale = makeBandScale(['a', 'b', 'c'], [0, 300]);
    expect(scale('a')).toBeLessThan(scale('b') as number);
    expect(scale('b')).toBeLessThan(scale('c') as number);
  });
});

describe('innerWidth / innerHeight', () => {
  it('subtracts the margin', () => {
    const margin = { top: 10, right: 5, bottom: 20, left: 40 };
    expect(innerWidth(300, margin)).toBe(255);
    expect(innerHeight(200, margin)).toBe(170);
  });

  it('never goes negative when the box is smaller than the margin', () => {
    const margin = { top: 10, right: 10, bottom: 10, left: 10 };
    expect(innerWidth(5, margin)).toBe(0);
    expect(innerHeight(5, margin)).toBe(0);
  });
});
