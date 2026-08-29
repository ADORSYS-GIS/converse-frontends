import { Command } from 'cmdk';
import React from 'react';

import { cn } from '../../cn';
import { Button } from '../button';
import type { CommandPaletteProps, CommandPaletteTriggerProps } from './types';
import { LABEL_CLASS, META_CLASS } from '../../lib/type-roles';
import { OVERLAY_BACKDROP_CLASS, OVERLAY_CLASS, OVERLAY_ITEM_CLASS } from '../../lib/overlay';

const DEFAULT_PLACEHOLDER = 'Jump to a page or run an action…';
const DEFAULT_EMPTY_MESSAGE = 'No matches.';
const DEFAULT_LABEL = 'Command palette';

// A shortcut chip, on daisy kbd. Written once because the palette shows two of them — esc inside
// the dialog, the open shortcut on the trigger — and they are the same chip. daisy's own defaults
// are re-pointed at the console's tokens rather than accepted: it fills a chip with base-200,
// which IS the panel the palette floats on, so a stock kbd would be invisible; and it colours the
// glyph base-content, where a shortcut hint is metadata and belongs on subtle.
const KBD_HINT_CLASS = 'kbd kbd-sm border-border bg-raised text-subtle';

// The palette's own panel: wide, anchored near the top of the viewport rather than centred, so
// the list grows downward into empty space instead of pushing itself off both edges.
const PALETTE_POPUP_CLASS = cn(
  'fixed top-[18vh] left-1/2 z-50 w-[92vw] max-w-[560px] -translate-x-1/2 font-mono',
  OVERLAY_CLASS
);

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
 * Paint is daisy plus the shared overlay vocabulary. The search line is daisy input at
 * input-ghost, which is the library's name for an input with no chrome of its own; the three
 * overrides on it are the three places daisy contradicts the contract, each checked against the
 * compiled stylesheet: input-ghost repaints its fill with base-100 (the FLOOR) on focus, .input
 * draws a 2px focus outline where the console never rings a field, and neither sets a text colour
 * strong enough for the thing you are typing. Rows, the scrim and the hairline all come from
 * lib/overlay.ts, so the palette highlights exactly like a Menu or a Select popup — cmdk marks
 * the active row data-selected where Base UI marks it data-highlighted, and that shared class
 * answers to both.
 */
export function CommandPalette({
  open,
  onOpenChange,
  groups,
  placeholder = DEFAULT_PLACEHOLDER,
  emptyMessage = DEFAULT_EMPTY_MESSAGE,
  label = DEFAULT_LABEL,
}: CommandPaletteProps) {
  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label={label}
      loop
      overlayClassName={OVERLAY_BACKDROP_CLASS}
      contentClassName={PALETTE_POPUP_CLASS}>
      <div className="border-raised flex items-center gap-2 border-b pr-3">
        <Command.Input
          autoFocus
          placeholder={placeholder}
          className="input input-ghost text-ink! placeholder:text-subtle flex-1 bg-transparent! outline-none!"
        />
        {/* daisy's own kbd already pins flex-shrink to 0, so the row cannot squeeze this. */}
        <kbd className={KBD_HINT_CLASS}>esc</kbd>
      </div>
      <Command.List className="max-h-[60vh] overflow-y-auto p-1">
        <Command.Empty className={cn(META_CLASS, 'px-3 py-6 text-center')}>
          {emptyMessage}
        </Command.Empty>
        {groups.map((group) => (
          <Command.Group
            key={group.key}
            heading={
              <span className={cn(LABEL_CLASS, 'block px-2 pt-1 pb-1.5')}>{group.heading}</span>
            }
            className="px-1 py-1.5">
            {group.items.map((item) => (
              <Command.Item
                key={item.key}
                keywords={item.keywords}
                onSelect={() => {
                  onOpenChange(false);
                  item.onSelect();
                }}
                className={cn(OVERLAY_ITEM_CLASS, 'justify-between rounded-[2px]')}>
                <span className="truncate">{item.label}</span>
                {item.hint ? (
                  <span className={cn(META_CLASS, 'ml-3 shrink-0')}>{item.hint}</span>
                ) : null}
              </Command.Item>
            ))}
          </Command.Group>
        ))}
      </Command.List>
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
 * import away. The two that remain are the type role a header affordance takes, one step quieter
 * than a real action button.
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
      className={cn('text-subtle! text-[11px]!', className)}>
      <span>Search…</span>
      <kbd className={KBD_HINT_CLASS}>{shortcutHint}</kbd>
    </Button>
  );
}
