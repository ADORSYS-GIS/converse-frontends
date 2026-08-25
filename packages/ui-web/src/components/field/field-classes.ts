// Shared "field control" treatment for the handful of raw form elements that sit outside
// `Field`'s own Base UI wiring -- `RailSelect`'s native `<select>` and the refine-mock scope-slot
// demo select. `Field` itself composes Base UI Field + the daisy `input`/`textarea` classes
// directly (see `component.tsx`); this plain string is what PRIMITIVES.md means by
// "`fieldControlVariants` reduces to a class string" -- no `error`/`multiline` axes survive here
// since the only remaining consumers are single-line, always-valid selects.
export const fieldControlClassName =
  'h-[30px] w-full rounded-[2px] border border-border bg-chrome px-3 font-mono text-sm text-soft placeholder:text-subtle transition-colors duration-150 ease-out focus:outline-hidden focus:border-primary disabled:cursor-not-allowed disabled:opacity-60';

// Label above a field control -- 10px mono, uppercase, tracked .09em, `subtle` (console-ui skill
// "Type" roles -- `label`).
export const fieldLabelClassName =
  'block font-mono text-[10px] uppercase tracking-[.09em] text-subtle';
