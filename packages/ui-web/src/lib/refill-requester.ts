// Who asked for a budget refill — the one definition the review queue's Requester column and
// `ReviewDetailPanel`'s own header block both render from (converse-frontends#444).
//
// `AugmentationRequest.requestedByUserId` (lightbridge-authz#646) is a token subject, never a
// name, and resolving it is a SEPARATE batch call (`resolveUserProfiles`, lightbridge-authz#647)
// that can be absent, in flight, or fail. That is four genuinely different facts, and collapsing
// them into one nullable string is exactly how a console ends up printing "Unknown" at a reader
// who is actually looking at a lookup that has not answered yet. So the requester is a discriminated
// union and every branch carries its own labelled sentinel — the console owns every sentinel it
// shows, the backend fabricates none (that is #647's own non-negotiable).
export type RefillRequester =
  /** Resolved against `federated_identities`: a real display name, and an email when the identity
   *  carries one (every profile field but `userId` is independently nullable). */
  | { kind: 'user'; name: string; email?: string }
  /** `requestedByUserId` is NULL and permanently so — the row predates
   *  `migrations/20260902000004_budget_augmentation_requests_add_requested_by.sql` and nothing can
   *  reconstruct its requester. */
  | { kind: 'unknown' }
  /** A real id that `resolveUserProfiles` returned no usable identity for (no row, or a `users`
   *  row with no completed federated login), or whose lookup failed outright. The id itself is
   *  still shown — de-emphasised — because it is the only true thing left to say. */
  | { kind: 'unresolved'; userId: string }
  /** The batch lookup is in flight. Distinct from `unresolved` on purpose: "we have not asked
   *  yet" and "we asked and got nothing" are different claims. */
  | { kind: 'resolving' };

/** The pre-migration sentinel — dated, so it reads as a fact about the record rather than as a
 *  failure of this screen. */
export const REQUESTER_UNKNOWN_LABEL = 'Unknown (pre-2026-09)';
/** The lookup-answered-with-nothing sentinel. */
export const REQUESTER_UNRESOLVED_LABEL = 'Unresolved user';
/** The lookup-still-running sentinel. */
export const REQUESTER_RESOLVING_LABEL = 'Resolving…';

export interface RequesterDisplay {
  /** The first line — a name, or a labelled sentinel. Never a raw id on its own. */
  label: string;
  /** The second line: the email of a resolved identity, or the raw id of an unresolved one.
   *  Absent when there is genuinely nothing more to say. */
  detail?: string;
  /** De-emphasised rendering — true for every sentinel branch, false only for a real name.
   *  The same emphasis contract `containers/sentinel-labels.ts` applies to usage rows. */
  subtle: boolean;
}

/** The single mapping from a `RefillRequester` to the two lines every surface renders it as. */
export function requesterDisplay(requester: RefillRequester): RequesterDisplay {
  switch (requester.kind) {
    case 'user':
      return { label: requester.name, detail: requester.email, subtle: false };
    case 'unresolved':
      return { label: REQUESTER_UNRESOLVED_LABEL, detail: requester.userId, subtle: true };
    case 'resolving':
      return { label: REQUESTER_RESOLVING_LABEL, subtle: true };
    case 'unknown':
      return { label: REQUESTER_UNKNOWN_LABEL, subtle: true };
  }
}
