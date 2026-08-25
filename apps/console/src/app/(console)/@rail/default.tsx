/**
 * Fallback for the `@rail` slot on any `(console)` route that has no rail content of its own — and
 * on a hard navigation into a route whose slot state Next cannot recover.
 *
 * `null` rather than a placeholder: `ConsoleShell` drops the rail column entirely when
 * `rightRail` is empty, which is exactly the intended layout for a rail-less screen.
 */
export default function RailDefault() {
  return null;
}
