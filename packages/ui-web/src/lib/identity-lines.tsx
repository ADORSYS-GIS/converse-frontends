import React from 'react';

import { cn } from '../cn';
import { META_CLASS } from './type-roles';

/**
 * An identity rendered as the two lines every surface in this console shows one as: who it is on
 * the first line, the fact that disambiguates them — an email, an owner, a parent account, or the
 * raw id when nothing resolved — muted underneath.
 *
 * Extracted from `requester-lines.tsx` (which now composes it) when the declarative dashboards'
 * actor table needed the identical treatment for users, accounts and projects
 * (converse-frontends#448). Two surfaces spelling "name over email" separately is exactly how the
 * two drift apart, and a third would have made that certain.
 *
 * It deliberately sets no font SIZE on the first line: a table cell (12px, `console-table`) and a
 * definition-list value (13px, `BODY_CLASS`) are different type contexts. What it owns is the
 * pair's STRUCTURE and its emphasis — `ink` for a real name, `subtle` for a labelled sentinel — and
 * one treatment for the second line whatever it holds, so a sentinel row never reads as louder
 * than a resolved one.
 */
export function IdentityLines({
  label,
  detail,
  subtle,
  className,
}: {
  label: string;
  /** The supporting line. Omitted entirely when there is nothing true to put there — never filled
   *  with a placeholder. */
  detail?: string;
  subtle?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('flex flex-col', className)}>
      <span className={subtle ? 'text-subtle' : 'text-ink'}>{label}</span>
      {detail ? <span className={META_CLASS}>{detail}</span> : null}
    </span>
  );
}

/**
 * A PERSON the console is rendering, in every state the resolution of that person can be in —
 * `RefillRequester`'s shape (`lib/refill-requester.ts`, converse-frontends#444) generalised for
 * `/admin/sessions` (converse-frontends#450), which needs it verbatim for its own user column.
 *
 * It is generalised rather than reused as-is because exactly one thing differs between the two
 * screens, and it is a fact about the RECORD, not about the renderer: what a missing id MEANS. A
 * refill request with no `requestedByUserId` predates
 * `migrations/20260902000004_budget_augmentation_requests_add_requested_by.sql`; a session with no
 * `subject` predates `migrations/20260824000003_sessions_add_subject.sql` — two different dates,
 * two different sentences, one identical two-line treatment. So `unknown` carries its own label and
 * each caller states the one that is true for its own table.
 *
 * `RefillRequester` is deliberately NOT re-pointed at this union: its screens speak in requesters,
 * its dated sentinel is stated once in `requesterDisplay`, and both unions already land on the
 * same two-line pair `IdentityLines` above renders — which is where the treatment they share
 * actually lives.
 */
export type ConsoleIdentity =
  /** Resolved against `federated_identities`: a real display name, and an email when the identity
   *  carries one (every profile field but `userId` is independently nullable). */
  | { kind: 'user'; name: string; email?: string }
  /** There is no id to resolve, permanently — the record predates the column that would hold one.
   *  `label` is the caller's own dated sentence for that, so it reads as a fact about the record
   *  rather than as a failure of the screen showing it. */
  | { kind: 'unknown'; label: string }
  /** A real id the batch lookup returned no usable identity for (no row, or a `users` row with no
   *  completed federated login), or whose lookup failed outright. The id itself is still shown —
   *  de-emphasised — because it is the only true thing left to say. */
  | { kind: 'unresolved'; userId: string }
  /** The batch lookup is in flight. Distinct from `unresolved` on purpose: "we have not asked
   *  yet" and "we asked and got nothing" are different claims. */
  | { kind: 'resolving' };

/** The lookup-answered-with-nothing sentinel. */
export const IDENTITY_UNRESOLVED_LABEL = 'Unresolved user';
/** The lookup-still-running sentinel. */
export const IDENTITY_RESOLVING_LABEL = 'Resolving…';

/** The two lines `IdentityLines` renders, as data: a first line that is a name or a labelled
 *  sentinel, an optional supporting line, and whether the pair is de-emphasised. Structurally
 *  identical to `RequesterDisplay` — both feed the same component. */
export interface IdentityDisplay {
  label: string;
  detail?: string;
  subtle: boolean;
}

/** The single mapping from a `ConsoleIdentity` to the two lines every surface renders it as. */
export function identityDisplay(identity: ConsoleIdentity): IdentityDisplay {
  switch (identity.kind) {
    case 'user':
      return { label: identity.name, detail: identity.email, subtle: false };
    case 'unresolved':
      return { label: IDENTITY_UNRESOLVED_LABEL, detail: identity.userId, subtle: true };
    case 'resolving':
      return { label: IDENTITY_RESOLVING_LABEL, subtle: true };
    case 'unknown':
      return { label: identity.label, subtle: true };
  }
}
