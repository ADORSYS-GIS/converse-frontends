import { renderHook } from '@testing-library/react-native';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import useWindowDimensions from 'react-native/Libraries/Utilities/useWindowDimensions';
import { designTokens } from '@lightbridge/ui';

import { hasPersistentLeftPanel, useShellTier } from '../use-shell-tier';

const mockUseWindowDimensions = useWindowDimensions as jest.Mock;

function setWidth(width: number) {
  mockUseWindowDimensions.mockReturnValue({ width, height: 800, scale: 1, fontScale: 1 });
}

// ADR 0008 Decision 2's three-tier breakpoint ladder: `full` (≥1024), `compact` (600..1024),
// `guardRail` (<600). Each boundary is exercised on both sides so an off-by-one in the `>=`
// comparisons in `packages/ui/src/hooks/use-shell-tier.ts` would fail one of these, not just
// pass unnoticed in the interior of a band. This app re-exports the hook from `@lightbridge/ui`
// unchanged (`../use-shell-tier.ts`), so testing it here exercises the real implementation.
describe('useShellTier', () => {
  it('reports `full` at and above the full breakpoint (1024)', async () => {
    setWidth(designTokens.breakpoint.full);
    expect((await renderHook(() => useShellTier())).result.current).toBe('full');

    setWidth(1440);
    expect((await renderHook(() => useShellTier())).result.current).toBe('full');
  });

  it('reports `compact` just below the full breakpoint', async () => {
    setWidth(designTokens.breakpoint.full - 1);
    expect((await renderHook(() => useShellTier())).result.current).toBe('compact');
  });

  it('reports `compact` at and above the compact breakpoint (600), below full', async () => {
    setWidth(designTokens.breakpoint.compact);
    expect((await renderHook(() => useShellTier())).result.current).toBe('compact');

    // The ADR's own worked example: forced landscape means even a phone (~930pt wide in
    // landscape) lands here, never in guardRail.
    setWidth(930);
    expect((await renderHook(() => useShellTier())).result.current).toBe('compact');
  });

  it('reports `guardRail` just below the compact breakpoint', async () => {
    setWidth(designTokens.breakpoint.compact - 1);
    expect((await renderHook(() => useShellTier())).result.current).toBe('guardRail');
  });

  it('reports `guardRail` well below the compact breakpoint', async () => {
    setWidth(320);
    expect((await renderHook(() => useShellTier())).result.current).toBe('guardRail');
  });
});

describe('hasPersistentLeftPanel', () => {
  it('is true for full and compact, false only for guardRail', async () => {
    expect(hasPersistentLeftPanel('full')).toBe(true);
    expect(hasPersistentLeftPanel('compact')).toBe(true);
    expect(hasPersistentLeftPanel('guardRail')).toBe(false);
  });
});
