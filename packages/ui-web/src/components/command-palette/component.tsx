import { Command } from 'cmdk';
import React from 'react';

import { cn } from '../../cn';
import type { CommandPaletteProps, CommandPaletteTriggerProps } from './types';

const DEFAULT_PLACEHOLDER = 'Jump to a page or run an action…';
const DEFAULT_EMPTY_MESSAGE = 'No matches.';
const DEFAULT_LABEL = 'Command palette';

/**
 * `⌘K`/`Ctrl-K` command palette (ADR 0010 Decision 6, `docs/design/console-
 * redesign/PRIMITIVES.md` "command-palette" row). cmdk owns the whole primitive:
 * fuzzy filtering, keyboard traversal (arrow keys + vim bindings), and the
 * dialog's focus trap/scroll-lock/Escape-to-close via the `@radix-ui/react-
 * dialog` it brings transitively (console-ui skill: "`radix-ui` is not a direct
 * dependency ... stays transitive").
 *
 * Pure and controlled: every item is a caller-supplied `onSelect` callback. This
 * component knows nothing about `apps/console`'s routes or its screens' data
 * hooks -- no routing inside `ui-web` (console-ui skill "Composition").
 *
 * Styling follows the skill's palette contract exactly: `surface` panel, radius
 * 2, mono type, no shadow, `bg-muted/80` floor overlay (the same overlay token
 * `vaul`'s bottom sheets use), `kbd` classes for the shortcut hints.
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
      overlayClassName="fixed inset-0 z-50 bg-muted/80"
      contentClassName="fixed top-[18vh] left-1/2 z-50 w-[92vw] max-w-[560px] -translate-x-1/2 rounded-[2px] bg-surface font-mono outline-hidden">
      <div className="flex items-center gap-2 border-b border-raised px-3">
        <Command.Input
          autoFocus
          placeholder={placeholder}
          className="h-11 flex-1 bg-transparent text-sm text-ink outline-hidden placeholder:text-subtle"
        />
        <kbd className="kbd kbd-sm shrink-0 border-border bg-raised text-subtle">esc</kbd>
      </div>
      <Command.List className="max-h-[60vh] overflow-y-auto p-1">
        <Command.Empty className="px-3 py-6 text-center text-xs text-subtle">
          {emptyMessage}
        </Command.Empty>
        {groups.map((group) => (
          <Command.Group
            key={group.key}
            heading={group.heading}
            className={cn(
              'px-2 py-1.5',
              '[&_[cmdk-group-heading]]:px-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1.5',
              '[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:tracking-[.09em] [&_[cmdk-group-heading]]:text-subtle [&_[cmdk-group-heading]]:uppercase',
            )}>
            {group.items.map((item) => (
              <Command.Item
                key={item.key}
                keywords={item.keywords}
                onSelect={() => {
                  onOpenChange(false);
                  item.onSelect();
                }}
                className={cn(
                  'flex cursor-pointer items-center justify-between rounded-[2px] px-2 py-1.5 text-xs text-soft outline-hidden',
                  'data-[selected=true]:bg-raised data-[selected=true]:text-ink',
                )}>
                <span className="truncate">{item.label}</span>
                {item.hint ? (
                  <span className="ml-3 shrink-0 text-[11px] text-subtle">{item.hint}</span>
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
 * Visible `⌘K` affordance for `ConsoleHeader`'s new `paletteTrigger` slot
 * (`docs/design/console-redesign/PRIMITIVES.md` `console-header` row: "Gains
 * ... the ⌘K palette trigger (phase 3)"). A plain button -- opening is the
 * caller's `onClick`, typically the same `setOpen` the `⌘K` shortcut drives.
 */
export function CommandPaletteTrigger({
  onClick,
  className,
  shortcutHint = '⌘K',
}: CommandPaletteTriggerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open command palette"
      className={cn(
        'flex items-center gap-2 rounded-[2px] border border-border bg-transparent px-2.5 py-1 font-mono text-[11px] text-subtle outline-hidden transition-colors',
        'hover:text-ink focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-chrome',
        className,
      )}>
      <span>Search…</span>
      <kbd className="kbd kbd-sm border-border bg-raised text-subtle">{shortcutHint}</kbd>
    </button>
  );
}
