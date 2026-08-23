export const designTokens = {
  // Three-tier breakpoint ladder (ADR 0008 Decision 2). `≥full` is the complete
  // shell; `compact..full` keeps a persistent left panel but collapses the
  // right column into a bottom sheet; below `compact` is the unsupported
  // guard rail (not a design target — it only has to avoid looking actively
  // broken, since a forced-landscape phone already lands in `compact`, never
  // here, per the ADR's own worked example). See `hooks/use-shell-tier.ts`.
  breakpoint: {
    full: 1024,
    compact: 600,
  },
  layout: {
    // Left nav panel width — a compact icon rail, persistent from `compact` up
    // through `full`. Keep in sync with the `sidebar` width in
    // components/nav-container/cva.tsx.
    navRailWidth: 68,
    topBarMinHeight: 58,
    bottomNavClearance: 100,
    formFooterClearance: 140,
    // Content sits in a centered column of this max width on wide screens, so
    // nothing goes full-bleed on desktop; below it, content is edge-to-edge.
    maxContentWidth: 1040,
  },
  icon: {
    nav: 22,
    // Desktop side-rail glyph — a touch smaller than the bottom-tab `nav` icon
    // so the rail reads as compact, not chunky.
    rail: 19,
    action: 20,
    prominent: 24,
  },
  spacing: {
    inlineXs: 8,
    topBarHorizontal: 16,
    topBarVertical: 10,
    contentHorizontal: 20,
    contentTop: 22,
    contentBottom: 32,
  },
  typography: {
    compactTitle: 20,
  },
} as const;
