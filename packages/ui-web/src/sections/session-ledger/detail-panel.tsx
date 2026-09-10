import React from 'react';

import { cn } from '../../cn';
import { Button } from '../../components/button';
import { ConfirmDialog } from '../../components/confirm-dialog';
import { ErrorLine } from '../../components/error-line';
import { InlineStatus } from '../../components/inline-status';
import { StatusText } from '../../components/status-text';
import { TypedConfirmDialog } from '../../components/typed-confirm-dialog';
import { DETAIL_LIST_CLASS, DETAIL_ROW_CLASS, DETAIL_SECTION_CLASS } from '../../lib/detail-row';
import { IdentityLines, identityDisplay } from '../../lib/identity-lines';
import { BODY_CLASS, LABEL_CLASS, META_CLASS } from '../../lib/type-roles';
import type { SessionDetailPanelProps } from './types';

const STACK_CLASS = 'rail-stack';
const SECTION_CLASS = 'rail-section';

const KIND_SENTENCE: Record<'browser' | 'token', string> = {
  browser: 'Browser session',
  token: 'Token session',
};

const STATUS_LABEL = { active: 'Active', revoked: 'Revoked', expired: 'Expired' } as const;

/**
 * The body of `/admin/sessions`' row-detail `BottomSheet` (converse-frontends#450, story C7): the
 * facts a table cell has no room for, and the two revoke actions.
 *
 * **The two confirmations are deliberately different primitives**, and the split is the one
 * `ConfirmDialog`'s own docstring states — "reach for the typed one whenever the loss survives the
 * tab closing" — read as "whenever a mis-aimed click cannot be taken back by the person it hit":
 *
 *  - **Close session** — plain `ConfirmDialog`. It closes ONE session the operator is looking at;
 *    the consequence is that its owner signs in again. There is no name worth typing for that, and
 *    demanding one would be theatre.
 *  - **Close all sessions for this user** — `TypedConfirmDialog`, typing the person's email (or
 *    their display name when the identity carries none). It is not more destructive per session;
 *    it is aimed at a DIFFERENT, absent person's every device at once, and the object name is
 *    precisely the guard against aiming it at the wrong row of an operator table. The story's own
 *    acceptance criterion asks only that "the confirmation names the user and the number of
 *    sessions affected" — it does, in the typed dialog's description, and the typed input is the
 *    stricter reading of the same requirement (deviation stated in the PR body).
 *
 * `subjectSessionsOnPage` is what the description quotes, in those words. `querySessions` pages
 * and does not total, so "every active session for this person" is the honest claim about the
 * ACTION and "n of them listed on this page" is the honest claim about the NUMBER — a fabricated
 * grand total would be neither.
 */
export function SessionDetailPanel({
  session,
  onRequestClose,
  closeConfirmOpen,
  onConfirmClose,
  onCancelClose,
  onRequestCloseAll,
  closeAllConfirmOpen,
  onConfirmCloseAll,
  onCancelCloseAll,
  busy = false,
  error,
  success,
  className,
}: SessionDetailPanelProps) {
  // An already-revoked (or expired) session has nothing left to close, so the action is ABSENT
  // rather than disabled: there is no state the operator could get it into from here.
  const canClose = session.status === 'active';
  // Without a recorded `subject` there is no `accountId` to aim `revokeSubjectSessions` at — a row
  // minted before `migrations/20260824000003_sessions_add_subject.sql`. Same reasoning: absent,
  // not disabled, and the reason is stated in the fact list below (the Subject row).
  const canCloseAll = Boolean(session.subject);
  const person = identityDisplay(session.user).label;

  return (
    <div className={cn('rail-panel-stack', className)}>
      <div className={STACK_CLASS}>
        <span className={LABEL_CLASS}>Signed in as</span>
        <IdentityLines {...identityDisplay(session.user)} />
        <span className={META_CLASS}>
          {KIND_SENTENCE[session.kind]}
          {session.offline ? ' · offline (refresh chain carries offline_access)' : ''}
        </span>
      </div>

      {/* Both fact blocks are capped to a readable measure — `lib/detail-row.ts`'s own
          `DETAIL_SECTION_CLASS`, whose docstring records why: a term/value row is
          `justify-between`, and across the full width of a bottom sheet the label sits against the
          left edge with its value ~1200px away, at which point the eye stops pairing them. */}
      <div className={DETAIL_SECTION_CLASS}>
        <dl className={cn(DETAIL_LIST_CLASS, SECTION_CLASS)}>
          <div className={DETAIL_ROW_CLASS}>
            <dt className={LABEL_CLASS}>Status</dt>
            <dd className={BODY_CLASS}>
              <StatusText tone={session.status === 'active' ? 'active' : 'muted'}>
                {STATUS_LABEL[session.status]}
              </StatusText>
            </dd>
          </div>
          <div className={DETAIL_ROW_CLASS}>
            <dt className={LABEL_CLASS}>Account</dt>
            <dd className={BODY_CLASS}>{session.account}</dd>
          </div>
          <div className={DETAIL_ROW_CLASS}>
            <dt className={LABEL_CLASS}>Client (azp)</dt>
            <dd className={BODY_CLASS}>{session.client ?? 'None recorded'}</dd>
          </div>
          <div className={DETAIL_ROW_CLASS}>
            <dt className={LABEL_CLASS}>Created</dt>
            <dd className={BODY_CLASS}>{session.created}</dd>
          </div>
          <div className={DETAIL_ROW_CLASS}>
            <dt className={LABEL_CLASS}>Last used</dt>
            <dd className={BODY_CLASS}>{session.lastUsed ?? 'Never'}</dd>
          </div>
          <div className={DETAIL_ROW_CLASS}>
            <dt className={LABEL_CLASS}>Expires</dt>
            <dd className={BODY_CLASS}>{session.expires}</dd>
          </div>
        </dl>

        <dl className={cn(DETAIL_LIST_CLASS, SECTION_CLASS)}>
          <div className={DETAIL_ROW_CLASS}>
            <dt className={LABEL_CLASS}>Session id</dt>
            <dd className={BODY_CLASS}>{session.id}</dd>
          </div>
          <div className={DETAIL_ROW_CLASS}>
            <dt className={LABEL_CLASS}>Subject</dt>
            {/* Stated, never blanked: a null subject is why "close all for this user" is unavailable
              on this row, and the reader should not have to infer that from a missing button. */}
            <dd className={BODY_CLASS}>
              {session.subject ?? 'Not recorded (pre-2026-08 session)'}
            </dd>
          </div>
          <div className={DETAIL_ROW_CLASS}>
            <dt className={LABEL_CLASS}>Account id</dt>
            <dd className={BODY_CLASS}>{session.accountId}</dd>
          </div>
          <div className={DETAIL_ROW_CLASS}>
            <dt className={LABEL_CLASS}>Project id</dt>
            <dd className={BODY_CLASS}>{session.projectId}</dd>
          </div>
          <div className={DETAIL_ROW_CLASS}>
            <dt className={LABEL_CLASS}>User agent</dt>
            <dd className={BODY_CLASS}>{session.userAgent ?? 'Not recorded'}</dd>
          </div>
        </dl>
      </div>

      {error ? <ErrorLine message={error} /> : null}
      {success ? <InlineStatus>{success}</InlineStatus> : null}

      {/* The actions are the panel's LAST child, which is what pins them to the foot of the sheet
          (`rail-panel-stack`'s own `:last-child { margin-block-start: auto }` — the same pin
          `ReviewDetailPanel`'s decision buttons ride). The inner row exists because `rail-section`
          is a COLUMN: putting the buttons directly in it stretched a `primary` button to the full
          width of the sheet, which is the "never a large signal fill" rule broken by a layout
          accident rather than a decision. */}
      <div className={SECTION_CLASS}>
        <div className="flex flex-wrap gap-2">
          {canClose ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={busy}
              onClick={onRequestClose}>
              Close session
            </Button>
          ) : null}
          {canCloseAll ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={onRequestCloseAll}>
              Close all sessions for this user
            </Button>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={closeConfirmOpen}
        title="Close this session?"
        description={`${person} will be signed out of this ${session.kind} session and will need to sign in again. Nothing else is lost.`}
        confirmLabel="Close session"
        onConfirm={onConfirmClose}
        onCancel={onCancelClose}
      />

      <TypedConfirmDialog
        open={closeAllConfirmOpen}
        title={`Close every session for ${person}?`}
        description={`Every active session for ${person} will be closed — ${session.subjectSessionsOnPage} of them ${session.subjectSessionsOnPage === 1 ? 'is' : 'are'} listed on this page. They will be signed out on every device and will need to sign in again.`}
        objectName={session.confirmLabel}
        confirmLabel="Close all sessions"
        onConfirm={onConfirmCloseAll}
        onCancel={onCancelCloseAll}
        error={error}
      />
    </div>
  );
}
