import { OVERLAY_BACKDROP_CLASS, OVERLAY_CLASS } from './overlay';

// One definition of the console's modal-dialog chrome, consumed by every dialog in the library:
// TypedConfirmDialog (Base UI AlertDialog), AccountNameDialog, CreateProjectDialog and
// CreateApiKeyDialog (Base UI Dialog). Each of those four had its own hand-typed copy of the same
// seven class strings, and they had already drifted — two of them skipped OVERLAY_CLASS entirely
// (so they lost the overlay hairline), the confirm dialog capped at 400px where the other three
// capped at 420, and its inline error sat at mt-3 against everyone else's mt-4. Their own
// docstrings all claim to be "deliberately the same panel", so the drift was accidental, not a
// design decision; this file is that claim made true.
//
// Why no daisy modal/modal-box here: PRIMITIVES.md rejects it, and re-checking the reason holds.
// Base UI portals and positions its own popup, and daisy's .modal is a fixed inset-0 grid that
// owns positioning plus an opacity/visibility open transition keyed off :checked / .modal-open —
// state Base UI does not emit. Adopting .modal-box alone would still bring padding 1.5rem,
// max-width 32rem and a --depth-driven shadow, i.e. three declarations to undo for one to keep.
// See the report accompanying this change.

/** Scrim behind a modal dialog. */
export const DIALOG_BACKDROP_CLASS = OVERLAY_BACKDROP_CLASS;

/** The centred modal panel itself. */
export const DIALOG_POPUP_CLASS = `fixed top-1/2 left-1/2 z-50 w-full max-w-[420px] -translate-x-1/2 -translate-y-1/2 p-6 ${OVERLAY_CLASS}`;

/** Dialog heading — the `panel-title` type role. A heading is prose, not data (phase 9
 *  consistency pass — this was mono). */
export const DIALOG_TITLE_CLASS = 'font-sans text-base text-ink';

/** The sentence under the title that says what this dialog is about to do. */
export const DIALOG_DESCRIPTION_CLASS = 'mt-2 font-sans text-[11px] leading-[1.45] text-soft';

/** Vertical stack of form rows between the description and the action row. */
export const DIALOG_BODY_CLASS = 'mt-5 flex flex-col gap-4';

/** Explanatory prose under a control — never load-bearing, so `subtle`. */
export const DIALOG_HINT_CLASS = 'font-sans text-[11px] leading-[1.45] text-subtle';

/**
 * A submit failure the caller could not attribute to one field. Kept inline and `signal`
 * coloured; the dialog stays open (console-ui skill § States). Prose, like `ERROR_TEXT_CLASS`
 * (phase 9 consistency pass — this was mono).
 */
export const DIALOG_ERROR_CLASS = 'mt-4 font-sans text-[11px] leading-[1.4] text-primary';

/** Right-aligned cancel/confirm row that closes every dialog. */
export const DIALOG_ACTIONS_CLASS = 'mt-5 flex justify-end gap-3';
