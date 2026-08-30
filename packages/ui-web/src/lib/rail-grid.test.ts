import { describe, expect, it } from 'vitest';

import {
  RAIL_ACTIVE_BAR_INSET,
  RAIL_ICON_COLUMN_WIDTH,
  RAIL_LABEL_GAP,
  RAIL_NAV_ROW_HEIGHT,
  RAIL_ROW_BLEED,
  RAIL_ROW_PADDING_X,
  RAIL_SUBNAV_ROW_HEIGHT,
} from './rail-grid';

// Guards the sidebar row geometry the owner brief handed down (2026-08-30): row height 36, icon
// column 16, label gap 10, active-bar inset 8 — a future edit to one input must not silently
// leave the others (or the group-label/sub-nav row height difference) stale.
describe('rail-grid', () => {
  it('keeps the active-bar inset at the row bleed — the brief\'s "inset 8"', () => {
    expect(RAIL_ACTIVE_BAR_INSET).toBe(RAIL_ROW_BLEED);
    expect(RAIL_ACTIVE_BAR_INSET).toBe(8);
  });

  it('keeps the icon column at 16px — the brief\'s "icon col 16"', () => {
    expect(RAIL_ICON_COLUMN_WIDTH).toBe(16);
  });

  it('keeps the icon→label gap at 10px — the brief\'s "gap 10"', () => {
    expect(RAIL_LABEL_GAP).toBe(10);
  });

  it('keeps the row padding at 12px', () => {
    expect(RAIL_ROW_PADDING_X).toBe(12);
  });

  it('keeps the sidebar nav row at 36px — the brief\'s "row height 36"', () => {
    expect(RAIL_NAV_ROW_HEIGHT).toBe(36);
  });

  it('keeps the sub-nav/group-label row at 28px — the brief\'s "group-label height 28"', () => {
    expect(RAIL_SUBNAV_ROW_HEIGHT).toBe(28);
  });

  it('keeps the nav/sub-nav row-height difference a stated, deliberate 8px', () => {
    expect(RAIL_NAV_ROW_HEIGHT - RAIL_SUBNAV_ROW_HEIGHT).toBe(8);
  });
});
