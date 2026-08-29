import { LABEL_CLASS } from '../../lib/type-roles';

// Shared "field control" treatment for the handful of raw form elements that sit outside
// `Field`'s own Base UI wiring -- `SelectField`'s native `<select>` and the refine-mock scope-slot
// demo select. `Field` itself composes Base UI Field + the daisy `input`/`textarea` classes
// directly (see `component.tsx`); this plain string is what PRIMITIVES.md means by
// "`fieldControlVariants` reduces to a class string" -- no `error`/`multiline` axes survive here
// since the only remaining consumers are single-line, always-valid selects.
export const fieldControlClassName =
  'h-[30px] w-full rounded-[2px] border border-border bg-chrome px-3 font-mono text-sm text-soft placeholder:text-subtle transition-colors duration-150 ease-out focus:outline-hidden focus:border-primary disabled:cursor-not-allowed disabled:opacity-60';

// Label above a field control -- the shared `label` type role plus the block display this
// position needs. The role itself lives in `lib/type-roles.ts`; never re-declare it here.
export const fieldLabelClassName = `block ${LABEL_CLASS}`;
