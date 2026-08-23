import { useWindowDimensions } from 'react-native';

import { designTokens } from '../design/tokens';

/**
 * The three-tier responsive ladder from ADR 0008 Decision 2:
 *
 * - `full` (`≥1024`) — the complete three-column shell.
 * - `compact` (`600..1024`) — left nav panel persists, centre widens, the
 *   right column collapses into a bottom sheet.
 * - `guardRail` (`<600`) — unsupported; left nav collapses to bottom
 *   navigation. Not a design target, just "not visibly broken" — orientation
 *   is forced landscape everywhere in this app, so a phone in landscape
 *   (~930pt) lands in `compact`, never here.
 */
export type ShellTier = 'full' | 'compact' | 'guardRail';

export function useShellTier(): ShellTier {
  const { width } = useWindowDimensions();
  if (width >= designTokens.breakpoint.full) {
    return 'full';
  }
  if (width >= designTokens.breakpoint.compact) {
    return 'compact';
  }
  return 'guardRail';
}

/** Tiers where the left nav panel is a persistent floating panel, not bottom navigation. */
export function hasPersistentLeftPanel(tier: ShellTier): boolean {
  return tier !== 'guardRail';
}
