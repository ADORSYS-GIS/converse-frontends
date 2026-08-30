import { cn } from '../cn';
import { OVERLAY_CLASS } from './overlay';

// Paint for a Base UI Select, shared by every dialog that carries one. CreateApiKeyDialog and
// CreateProjectDialog each held a byte-identical copy of the trigger/positioner/popup strings —
// same catalogue, same shape, same three states — and SelectField holds a third near-copy.
//
// Behaviour is Base UI's throughout; this file only says what the parts look like.

/**
 * The trigger, on daisy `input` so a closed select reads as exactly the same control as the text
 * fields above it — same height, same inset fill, same hairline.
 *
 * Every `!` below is daisy losing a fight it picks with the console's contract, not decoration:
 * daisy fills `.input` with `base-100` (the FLOOR, where the console insets controls with
 * `chrome`), caps its width at `clamp(3rem, 20rem, 100%)`, sizes to 2.5rem against our 30px
 * control height, paints a `--depth`-driven inset box shadow, and draws a 2px focus OUTLINE
 * where the console moves the BORDER to `--signal`. `cursor-pointer` replaces daisy's
 * `cursor: text`, which is right for a text box and wrong for a button that opens a popup.
 */
export const SELECT_TRIGGER_CLASS = cn(
  'input h-[30px]! w-full! cursor-pointer justify-between rounded-[2px]! border! border-border! bg-chrome! px-3!',
  'font-sans text-sm text-soft shadow-none! outline-none!',
  'focus-visible:border-primary! data-[popup-open]:border-primary!',
  'disabled:cursor-not-allowed disabled:opacity-60'
);

/** Positioner: Base UI owns placement; this only lifts it and kills the wrapper's own outline. */
export const SELECT_POSITIONER_CLASS = 'z-50 outline-hidden select-none';

/** The popup list, on the shared overlay chrome, sized to its anchor. A select's value is a
 *  SETTING ("Last 30 days"), not data, so the popup reads sans like every other control (phase 9
 *  consistency pass — this was mono). */
export const SELECT_POPUP_CLASS = `w-(--anchor-width) py-1 font-sans ${OVERLAY_CLASS}`;
