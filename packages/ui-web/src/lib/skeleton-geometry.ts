// The loading BLOCK — the grey bar a skeleton row is made of — described once.
//
// Two components render it: `SkeletonRow` (standalone, and inside any list) and `LedgerTable`'s
// own loading `<tbody>`, which cannot compose `SkeletonRow` itself because that component is a
// `<div>` grid and a `<div>` cannot live inside a `<tbody>`. So the two share the block instead
// of the row, and this is the whole of what they share.
//
// `LedgerTable` already imported the widths from `../skeleton-row/cva` — one component reaching
// into another component's variant file. The geometry beside them was still duplicated, which is
// how `h-3` came to be typed in both places; moving the pair here makes the sharing explicit and
// gives it a home that is neither component's private business.

/**
 * Deterministic, varied block widths so a run of skeleton rows does not look like one repeated
 * bar — never randomised, because a loading state must be visually stable across renders.
 */
export const SKELETON_BLOCK_WIDTHS = ['72%', '48%', '60%', '36%', '64%', '44%'];

/**
 * The block itself. daisy's `skeleton` already resolves to `--color-base-300` (`raised`) at
 * `--radius-box` (2px), and its shimmer is suppressed once, centrally, by the `@utility skeleton`
 * override in `theme.css`. The 12px height is ours — daisy has no opinion on it.
 *
 * `block` is load-bearing in the table: a `<span>` inside a `<td>` is inline by default, so the
 * height would not apply at all there.
 */
export const SKELETON_BLOCK_CLASS = 'skeleton block h-3';
