import type { ReactNode } from 'react';

export interface SettingsRowProps {
  /** The row's own name — "Account name", "Status", "Quota tier". `ROW_LABEL_CLASS` (13px sans
   *  ink): a settings row's label stands alone, unlike a form field's caption beside its own
   *  control, so it reads a step stronger than `LABEL_CLASS`. */
  label: string;
  /** An optional one-line caption under the label — never load-bearing, `META_CLASS`. */
  description?: string;
  /** The row's value, trailing edge. Omit entirely for a row that is pure action (rare) rather
   *  than rendering an empty dash. */
  value?: ReactNode;
  /**
   * `'text'` (default) — a name, a status word, a tier id: sans, like every other UI string.
   * `'data'` — a displayed data value: an id, a date, a count: mono (`DATA_CLASS`). Same axis
   * `LedgerColumn.kind` uses for a table cell — a settings row and a table row are the same
   * "label, then its value" shape at a different density.
   */
  valueKind?: 'text' | 'data';
  /** Renders the value at `subtle` instead of its role's own colour — the "Not set" case: a
   *  value that is honestly absent, not a data point. */
  valueMuted?: boolean;
  /** The row's own action, trailing edge — a `Rename`/`Copy` button, typically `size="sm"`. */
  action?: ReactNode;
  /** Marks the row as the current selection (`ProjectSettings`' open `DetailSheet` target) — a
   *  `neutral` fill, the same "current" treatment `console-table`'s row hover uses, via
   *  `data-current` rather than a hand-written background utility at the call site. */
  current?: boolean;
  /**
   * Renders the row as a `<button>` (`onClick` required) rather than a `<div>` — `ProjectSettings`'
   * own rows, which open `DetailSheet` on click. A row with an `action` should not also be a
   * button (the action's own click would nest inside the row's), so the two are mutually
   * exclusive in practice, not enforced by the type.
   */
  onClick?: () => void;
  className?: string;
}
