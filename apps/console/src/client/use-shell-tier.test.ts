import { describe, expect, it } from 'vitest';

import { COMPACT_BREAKPOINT_PX, FULL_BREAKPOINT_PX, tierForWidth } from './use-shell-tier';

describe('tierForWidth', () => {
  it('treats sub-600 as the designed mobile base, not a guard rail to bail out of', () => {
    expect(tierForWidth(320)).toBe('guard');
    expect(tierForWidth(390)).toBe('guard');
    expect(tierForWidth(COMPACT_BREAKPOINT_PX - 1)).toBe('guard');
  });

  it('returns compact from 600 up to (but not including) 1024', () => {
    expect(tierForWidth(COMPACT_BREAKPOINT_PX)).toBe('compact');
    expect(tierForWidth(768)).toBe('compact');
    expect(tierForWidth(FULL_BREAKPOINT_PX - 1)).toBe('compact');
  });

  it('returns full at and above 1024', () => {
    expect(tierForWidth(FULL_BREAKPOINT_PX)).toBe('full');
    expect(tierForWidth(1440)).toBe('full');
  });
});
