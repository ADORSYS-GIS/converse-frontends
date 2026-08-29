/**
 * Fallback for the `@rail` slot on a hard navigation into a route whose slot state Next cannot
 * recover.
 *
 * It is NOT what makes a rail-less screen rail-less: a parallel-route slot is a React element
 * whatever its segment renders, so returning `null` here does not stop `ConsoleShell` reserving
 * the column. `(console)/layout.tsx` decides that, per route, by passing `rightRail={undefined}`.
 */
export default function RailDefault() {
  return null;
}
