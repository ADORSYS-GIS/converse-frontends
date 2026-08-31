import { Command } from 'cmdk';
import React from 'react';

import { cn } from '../../cn';
import { Button } from '../button';
import type { CommandPaletteProps, CommandPaletteTriggerProps } from './types';
import { SearchIcon } from '../../lib/icons';
import { RAIL_ICON_COLUMN_CLASS } from '../../lib/rail-grid';
import { META_CLASS } from '../../lib/type-roles';
import { OVERLAY_BACKDROP_CLASS, OVERLAY_CLASS, OVERLAY_ITEM_CLASS } from '../../lib/overlay';

const DEFAULT_PLACEHOLDER = 'Jump to a page or run an action…';
const DEFAULT_EMPTY_MESSAGE = 'No matches.';
const DEFAULT_LABEL = 'Command palette';

// A shortcut chip, on daisy kbd. The three places daisy's defaults contradict the console (its
// panel-coloured fill, its body-coloured glyph, its tinted hairline) are corrected once in
// theme.css's `@utility kbd`, so every chip the palette renders — a row's own shortcut and the
// three footer hints — is the same chip by construction.
const KBD_HINT_CLASS = 'kbd kbd-sm';

// The palette's own panel: overlay chrome, plus the geometry `palette-popup` carries.
const PALETTE_POPUP_CLASS = cn('palette-popup', OVERLAY_CLASS);

/**
 * The ⌘K command palette (ADR 0010 Decision 6, the command-palette row of
 * docs/design/console-redesign/PRIMITIVES.md). cmdk owns the whole primitive: fuzzy filtering,
 * keyboard traversal (arrow keys plus vim bindings), and the dialog's focus trap, scroll lock and
 * Escape to close via the Radix dialog it brings transitively (console-ui skill: radix stays
 * transitive, never a direct import).
 *
 * Pure and controlled: every item is a caller-supplied onSelect callback. This component knows
 * nothing about the console's routes or its screens' data hooks — no routing inside ui-web
 * (console-ui skill "Composition").
 *
 * v2 visual pass (owner review 2026-08-31 — "uglier even, and the corners are still sharp,
 * breaking with the rest of the app"; Storybook-only until the owner approves a screenshot, see
 * the component's stories): a leading search glyph on the input row, an icon column per row
 * (`item.icon`, the same `RAIL_ICON_COLUMN_CLASS` box every nav row uses), a right-aligned `kbd`
 * chip for a row's own shortcut, a 2px `primary` accent bar on the highlighted row instead of a
 * full fill (`palette-list`'s `[cmdk-item][data-selected='true']::before`, theme.css), and a
 * footer hint row (↑↓ · ↵ · esc) that replaced the old inline `esc` chip beside the search field.
 * Two DELIBERATE departures from the console-ui skill's own "sentence case everywhere" and "mono
 * is data only" rules, both explicit in this task's brief and NOT extended anywhere else in the
 * console: the group headings render upper-cased (`palette-group-heading`) and the empty-query
 * line renders in `font-mono` (`palette-empty`) rather than the sans `META_CLASS` every other
 * caption uses. Both are flagged in the accompanying report for the owner to keep or veto from
 * the screenshots — neither is wired into `apps/console`.
 *
 * Paint is daisy plus the shared overlay vocabulary. The search line is daisy input at
 * input-ghost, the library's name for an input with no chrome of its own; the places daisy
 * contradicts the contract there are corrected in theme.css against daisy's own class, not as a
 * row of ! utilities here. The scrim and the row highlight come from lib/overlay.ts, so the
 * palette highlights exactly like a Menu or a Select popup -- cmdk marks the active row
 * data-selected where Base UI marks it data-highlighted, and that shared class answers to both.
 *
 * Everything BELOW the search row is addressed through the cmdk-* attributes cmdk puts on its own
 * parts (its documented styling seam), from theme.css's palette-list. That is why the group,
 * heading, empty line and item rows carry no geometry classes at all: a list, a heading and a row
 * are facts about the palette, not decisions each element re-states.
 */
export function CommandPalette({
  open,
  onOpenChange,
  groups,
  placeholder = DEFAULT_PLACEHOLDER,
  emptyMessage = DEFAULT_EMPTY_MESSAGE,
  label = DEFAULT_LABEL,
  panelClassName,
}: CommandPaletteProps) {
  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label={label}
      loop
      overlayClassName={OVERLAY_BACKDROP_CLASS}
      contentClassName={cn(PALETTE_POPUP_CLASS, panelClassName)}>
      <div className="palette-search-row">
        <SearchIcon className="palette-search-icon" />
        <Command.Input
          autoFocus
          placeholder={placeholder}
          className="input input-ghost"
        />
      </div>
      <Command.List className="palette-list">
        <Command.Empty className="palette-empty">{emptyMessage}</Command.Empty>
        {groups.map((group) => (
          <Command.Group
            key={group.key}
            heading={<span className="palette-group-heading">{group.heading}</span>}>
            {group.items.map((item) => (
              <Command.Item
                key={item.key}
                keywords={item.keywords}
                onSelect={() => {
                  onOpenChange(false);
                  item.onSelect();
                }}
                className={OVERLAY_ITEM_CLASS}>
                <span className="palette-item-lead">
                  <span aria-hidden="true" className={RAIL_ICON_COLUMN_CLASS}>
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </span>
                {item.shortcut ? (
                  <kbd className={KBD_HINT_CLASS}>{item.shortcut}</kbd>
                ) : item.hint ? (
                  <span className={META_CLASS}>{item.hint}</span>
                ) : null}
              </Command.Item>
            ))}
          </Command.Group>
        ))}
      </Command.List>
      <div className="palette-footer">
        <span className="palette-footer-hint">
          <kbd className={KBD_HINT_CLASS}>↑↓</kbd> navigate
        </span>
        <span className="palette-footer-hint">
          <kbd className={KBD_HINT_CLASS}>↵</kbd> select
        </span>
        <span className="palette-footer-hint">
          <kbd className={KBD_HINT_CLASS}>esc</kbd>
        </span>
      </div>
    </Command.Dialog>
  );
}

/**
 * Visible ⌘K affordance for the console header's paletteTrigger slot (the console-header row of
 * PRIMITIVES.md: "Gains ... the palette trigger"). Opening is the caller's onClick, typically the
 * same setOpen the keyboard shortcut drives.
 *
 * It is the library's own Button at variant secondary — it had been re-deriving btn's border,
 * radius, mono face and focus ring by hand, nine utilities to arrive back at the component one
 * import away. The last two — the quieter colour and size a header affordance takes, one step
 * down from a real action button — were still written here, and written with `!`, which is what
 * a correction fighting daisy from inside the same layer looks like. They are `palette-trigger`
 * in theme.css now, where the same declarations beat `btn` on the cascade with no `!` at all.
 */
export function CommandPaletteTrigger({
  onClick,
  className,
  shortcutHint = '⌘K',
}: CommandPaletteTriggerProps) {
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={onClick}
      aria-label="Open command palette"
      className={cn('palette-trigger', className)}>
      <span>Search…</span>
      <kbd className={KBD_HINT_CLASS}>{shortcutHint}</kbd>
    </Button>
  );
}
