export const designTokens = {
  breakpoint: {
    desktop: 1024,
  },
  layout: {
    // Desktop side rail is a compact icon rail. Keep in sync with the `sidebar`
    // width in components/nav-container/cva.tsx.
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
