import { useEffect } from 'react';

/**
 * `⌘K`/`Ctrl-K` toggles the command palette open. A hook, not a component, per
 * ADR 0010 Decision 6 ("opened via Cmd+K / Ctrl+K") and the console-ui skill's
 * component-conventions: the listener is wired wherever the consumer mounts the
 * palette (`apps/console`'s persistent layout), not inside `CommandPalette`
 * itself, which stays a pure, controlled `open`/`onOpenChange` component.
 *
 * Matches cmdk's own documented pattern (`README.md` "Command Menu in a Dialog
 * with Keyboard Shortcut") verbatim, generalised to accept a functional update
 * so the same hook works whether the caller holds `open` in `useState` or a
 * reducer.
 */
export function useCommandPaletteShortcut(setOpen: (updater: (open: boolean) => boolean) => void) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((open) => !open);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setOpen]);
}
