import { useEffect } from 'react';
import type { RefObject } from 'react';

/**
 * A single-character hotkey that only fires while focus is INSIDE a given element — the zoom
 * affordance behind `DashboardPanel`'s `v` (converse-frontends#446, decision D-E).
 *
 * Same document-listener shape as `use-command-palette-shortcut.ts` (a hook wired by whoever
 * mounts the thing, never a listener buried inside a presentational component), with the two
 * differences a per-panel key needs and a global `⌘K` does not:
 *
 *  - **Scoped to focus-within.** A page renders many panels and they all listen at once, so the
 *    key must reach exactly the one the user is in. `containerRef.current.contains(activeElement)`
 *    is that test, evaluated at keydown rather than tracked as state — a `focus`/`blur` pair would
 *    have to be kept in sync with portalled content and re-renders, and the DOM already knows the
 *    answer. A panel with focus on its own root (`tabIndex={0}`) counts as inside itself.
 *  - **Refuses to fire while text is being entered.** An unmodified letter key is a legitimate
 *    character in an `<input>`, `<textarea>`, a `contenteditable` region, or any element that has
 *    opted into typing via `role="textbox"`/`role="searchbox"`/`role="combobox"`. Typing "v" into
 *    a filter box inside a panel must type a `v`, not expand the panel. Modified presses
 *    (⌘/Ctrl/Alt) are also ignored: those belong to the browser and the OS, and `⌘V` is paste.
 *
 * `key` is compared case-insensitively, so `V` (shift held) works, but a modifier-bearing chord
 * never does.
 */
export function usePanelHotkey(
  key: string,
  containerRef: RefObject<HTMLElement | null>,
  onTrigger: () => void,
  enabled = true
): void {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.toLowerCase() !== key.toLowerCase()) return;

      const container = containerRef.current;
      if (!container) return;

      const active = container.ownerDocument.activeElement;
      if (!(active instanceof HTMLElement) || !container.contains(active)) return;
      if (isTextEntry(active)) return;

      event.preventDefault();
      onTrigger();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [key, containerRef, onTrigger, enabled]);
}

/** Roles that accept typed characters even on an element that is not an `<input>`/`<textarea>` —
 *  a cmdk search row is exactly this shape. */
const TEXT_ENTRY_ROLES = new Set(['textbox', 'searchbox', 'combobox', 'spinbutton']);

function isTextEntry(element: HTMLElement): boolean {
  // Both readings, deliberately: `isContentEditable` is the live, inherited answer a real browser
  // gives, and the attribute is what jsdom actually exposes (it does not implement the property at
  // all, so a test asserting "typing `v` into a contenteditable does not expand" would silently
  // pass against a broken guard if only the property were checked).
  if (element.isContentEditable) return true;
  const editable = element.closest('[contenteditable]')?.getAttribute('contenteditable');
  if (editable !== null && editable !== undefined && editable !== 'false') return true;
  const tag = element.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  const role = element.getAttribute('role');
  return role !== null && TEXT_ENTRY_ROLES.has(role);
}
