/**
 * Fallback for the `@scope` slot (the left rail's secondary section).
 *
 * `null` rather than a placeholder: `ConsoleShell` renders no left-secondary block and no mobile
 * drawer trigger when this is empty, which is the right layout for a screen that has no scope
 * echo or sub-nav.
 */
export default function ScopeDefault() {
  return null;
}
