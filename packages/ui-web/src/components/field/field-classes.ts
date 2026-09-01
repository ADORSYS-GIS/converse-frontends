import { LABEL_CLASS } from '../../lib/type-roles';

/**
 * The console's ONE control treatment, named. It is daisy's `input` class and nothing else: the
 * height, fill, border, type, placeholder, focus-moves-the-border and disabled behaviour all come
 * from the `@utility input` block in `theme.css`, which corrects daisy's defaults once for the
 * whole package (ADR 0010 Decision 4).
 *
 * `Field` and the three Base UI Select/Popover triggers wear the same class directly. This
 * constant survives for the handful of RAW elements that sit outside a Base UI wiring and would
 * otherwise have to know the class name by heart: SecretReveal's read-only secret input, and the
 * Storybook-only refine-mock scope slot.
 *
 * History worth keeping: this used to be a 13-declaration `cn()` that mirrored a second copy in
 * `component.tsx` "one-for-one so the two never drift". They had drifted — the copy here was
 * missing the invalid-state border the copy there carried. One definition cannot drift.
 */
export const fieldControlClassName = 'input';

/**
 * Label above (or beside) a field control — the shared `label` type role plus the block display
 * this position needs. The role itself lives in lib/type-roles.ts; never re-declare it here.
 */
export const fieldLabelClassName = `block ${LABEL_CLASS}`;
