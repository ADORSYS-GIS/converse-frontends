import { describe, expect, it } from 'vitest';

import {
  RAIL_ACTIVE_BAR_INSET,
  RAIL_ICON_COLUMN_WIDTH,
  RAIL_LABEL_GAP,
  RAIL_LABEL_X,
  RAIL_NAV_ROW_HEIGHT,
  RAIL_ROW_BLEED,
  RAIL_ROW_PADDING_X,
  RAIL_SECTION_INSET,
  RAIL_SECTION_LABEL_INDENT,
  RAIL_SUBNAV_ROW_HEIGHT,
} from './rail-grid';

// Guards the derived constants — a future edit to one input (e.g. widening the icon column)
// must recompute the derived x-offsets, not leave them stale. This is what a "shared alignment
// grid" means in practice: the numbers are computed once, here, not re-typed per component.
describe('rail-grid', () => {
  it('derives the active-bar inset from the row bleed alone', () => {
    expect(RAIL_ACTIVE_BAR_INSET).toBe(RAIL_ROW_BLEED);
    expect(RAIL_ACTIVE_BAR_INSET).toBe(8);
  });

  it('derives the shared label x from bleed + row padding + icon column + gap', () => {
    expect(RAIL_LABEL_X).toBe(
      RAIL_ROW_BLEED + RAIL_ROW_PADDING_X + RAIL_ICON_COLUMN_WIDTH + RAIL_LABEL_GAP
    );
    expect(RAIL_LABEL_X).toBe(44);
  });

  it('derives the section-label indent as the gap between the label x and the base section inset', () => {
    expect(RAIL_SECTION_LABEL_INDENT).toBe(RAIL_LABEL_X - RAIL_SECTION_INSET);
    expect(RAIL_SECTION_LABEL_INDENT).toBe(28);
  });

  it('keeps the nav/sub-nav row-height difference a stated, deliberate 6px', () => {
    expect(RAIL_NAV_ROW_HEIGHT - RAIL_SUBNAV_ROW_HEIGHT).toBe(6);
  });
});
