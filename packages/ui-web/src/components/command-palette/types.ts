export interface CommandPaletteItem {
  /** Stable identity, used for React reconciliation only -- cmdk's own filter matches display text (see `component.tsx`). */
  key: string;
  label: string;
  /** Right-aligned secondary text, e.g. a keyboard shortcut or a route hint. Rendered, not filtered on. */
  hint?: string;
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
