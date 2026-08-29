import { cn } from '../../cn';
import { LABEL_CLASS } from '../../lib/type-roles';

// Shared "field control" treatment for the handful of raw form elements that sit outside
// `Field`'s own Base UI wiring: `SecretReveal`'s read-only secret `<input>` and the Storybook-only
// refine-mock scope-slot demo `<select>`. `Field` itself composes Base UI Field + the daisy
// `input`/`textarea` classes directly (see `component.tsx`); this plain string is what
// PRIMITIVES.md means by "`fieldControlVariants` reduces to a class string" -- no `error`/
// `multiline` axes survive here, since neither remaining consumer is multiline or validated.
//
// Docstring correction (PRIMITIVE-MATRIX row 28 / § "Documentation defects", item 3): this
// previously claimed to serve "`SelectField`'s native `<select>`". `SelectField` has been a Base
// UI `Select` -- a button trigger plus a portalled popup, with no native element anywhere -- since
// 2026-08-29, and has not imported this string since. The real consumers are the two named above.
//
// PRIMITIVE-MATRIX row 28: the height/border/fill/placeholder/focus/disabled treatment that used
// to be spelled out here is daisy `input`'s job. The declarations that remain are exactly the ones
// where daisy's defaults fight our tokens, and they mirror `component.tsx`'s `CONTROL_CLASS`
// one-for-one so the two never drift: daisy fills with `base-100` (the FLOOR) where the console
// insets controls with `chrome`; it caps width at `clamp(3rem, 20rem, 100%)`; it sizes to 2.5rem
// where our control height is 30px; and it draws a 2px focus OUTLINE where the console moves the
// BORDER to `--signal`.
export const fieldControlClassName = cn(
  'input h-[30px]! w-full! rounded-[2px]! border! border-border! bg-chrome! px-3! font-mono',
  'text-sm text-soft placeholder:text-subtle shadow-none! outline-none!',
  'focus:border-primary! focus-within:outline-none!',
  'disabled:cursor-not-allowed disabled:opacity-60',
  // daisy `.input` forces `appearance: none`, which is right for an `<input>` but strips the
  // native disclosure arrow off the one consumer that is a `<select>`, leaving a select that
  // looks like a text box. Restored here rather than at that call site so the shared class stays
  // safe on any raw control. (The proper fix is for the refine-mock demo to use `SelectField` --
  // the console-ui skill bans a native `<select>` outright -- but that mock is out of this row's
  // scope; see the report accompanying PRIMITIVE-MATRIX row 28.)
  'appearance-auto'
);

// Label above a field control -- the shared `label` type role plus the block display this
// position needs. The role itself lives in `lib/type-roles.ts`; never re-declare it here.
export const fieldLabelClassName = `block ${LABEL_CLASS}`;
