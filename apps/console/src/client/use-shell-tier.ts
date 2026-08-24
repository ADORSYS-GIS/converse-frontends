'use client';

import type { ConsoleShellTier } from '@lightbridge/ui-web';
import { useEffect, useState } from 'react';

/**
 * The responsive tier `ConsoleShell` expects, computed from the same breakpoints the Tailwind
 * config declares (ADR 0009 Decision 6): `<600` guard, `600–1024` compact, `>=1024` full.
 *
 * It starts at `guard` — the mobile-first base — so the first paint is the phone layout and wider
 * viewports upgrade on mount, rather than the reverse.
 */
export const COMPACT_BREAKPOINT_PX = 600;
export const FULL_BREAKPOINT_PX = 1024;

export function tierForWidth(width: number): ConsoleShellTier {
  if (width >= FULL_BREAKPOINT_PX) return 'full';
  if (width >= COMPACT_BREAKPOINT_PX) return 'compact';
  return 'guard';
}

export function useShellTier(): ConsoleShellTier {
  const [tier, setTier] = useState<ConsoleShellTier>('guard');

  useEffect(() => {
    const update = () => setTier(tierForWidth(window.innerWidth));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return tier;
}
