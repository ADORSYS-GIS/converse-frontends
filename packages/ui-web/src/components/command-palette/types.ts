import type { ReactNode } from 'react';

export interface CommandPaletteItem {
  /** Stable identity, used for React reconciliation only -- cmdk's own filter matches display text (see `component.tsx`). */
  key: string;
  label: string;
  /**
   * Leading glyph, rendered into the same 16px icon column every rail row uses
   * (`RAIL_ICON_COLUMN_CLASS`, `lib/rail-grid.ts`) -- one of `lib/icons.tsx`'s set, so a palette
   * row and its matching nav row share one glyph by construction. Optional: a row with no icon
   * still reserves the column, so icon and no-icon rows stay aligned on the same label x.
   */
  icon?: ReactNode;
  /** Right-aligned secondary text -- a route hint or short status. Rendered, not filtered on. */
  hint?: string;
  /**
   * A keyboard shortcut, rendered as a `kbd` chip at the row's trailing edge instead of plain
   * text -- distinct from `hint`, which is prose. A row never carries both; `shortcut` wins if
   * both are supplied.
   */
  shortcut?: string;
  /** Extra terms cmdk's fuzzy filter should also match, beyond `label` (e.g. synonyms, a route path). */
  keywords?: string[];
  onSelect: () => void;
}

export interface CommandPaletteGroup {
  key: string;
  heading: string;
  items: CommandPaletteItem[];
}

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Groups render top-to-bottom in the order given -- the caller owns ordering (e.g. Navigate before Actions). */
  groups: CommandPaletteGroup[];
  placeholder?: string;
  /** Shown when the free-text filter matches nothing across every group. */
  emptyMessage?: string;
  /** Accessible label for the dialog and its listbox. Not shown visibly. */
  label?: string;
}

export interface CommandPaletteTriggerProps {
  onClick: () => void;
  className?: string;
  /** Defaults to a Mac-style hint; pass `'Ctrl K'` to match the platform explicitly if the caller detects it. */
  shortcutHint?: string;
}
