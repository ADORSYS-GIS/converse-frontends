import React from 'react';

import { TypedConfirmDialog } from '../../components/typed-confirm-dialog';
import { requesterDisplay } from '../../lib/refill-requester';
import type { RevokeRoleDialogProps } from './types';

/**
 * What revocation actually does, stated where the operator decides.
 *
 * `revokePlatformRole` does not merely stamp `revoked_at`. It ALSO runs `revokeSubjectSessions`
 * for every account the person owns, because a revocation that only wrote the timestamp would
 * leave them holding a still-valid access token carrying the role for up to a full TTL, and a
 * refresh would keep re-minting it from the same live session. So the person is signed out. That
 * is a consequence the operator is entitled to know BEFORE confirming, not a surprise in the
 * success line.
 */
export const REVOKE_SESSION_NOTE =
  'Revoking also closes every session this person has, so the role stops applying immediately ' +
  'rather than at their next token mint. They will have to sign in again.';

/**
 * The extra sentence when the grant being revoked is the operator's OWN
 * (converse-frontends#452, negative AC 3).
 *
 * Revoking your own grant is a legitimate act — an operator standing down at the end of an
 * on-call rotation does exactly this — so it is not blocked. It is stated, because the outcome is
 * that this screen, and every other surface the role unlocked, disappears for them, and the way
 * back is another admin (or the `rbac grant` CLI bootstrap), not an undo button.
 */
export const REVOKE_SELF_WARNING =
  'This is your own grant. Confirming signs you out and removes your access to the admin area — ' +
  'only another operator, or the rbac CLI, can grant it back.';

/**
 * The revoke confirmation — `TypedConfirmDialog` with the ROLE NAME as the typed object.
 *
 * The role, not the grant id: a cuid2 is not something a human can proof-read, and the mistake
 * this gate exists to catch is "wrong role", not "wrong random string". Typing
 * `lightbridge-admin` is the operator restating what they are taking away, which is what makes
 * the pause useful rather than ceremonial.
 *
 * A dedicated wrapper rather than a `TypedConfirmDialog` assembled at the call site, so the copy
 * above lives in ONE place and is reviewable in Storybook — the container supplies only the row
 * and the mutation state.
 */
export function RevokeRoleDialog({
  grant,
  submitting,
  error,
  onConfirm,
  onCancel,
}: RevokeRoleDialogProps) {
  if (!grant) {
    // `TypedConfirmDialog` keeps its own instance mounted across open toggles, but there is no
    // grant to describe here at all — rendering it with placeholder copy would put a real object
    // name into a dialog nobody opened.
    return null;
  }

  const holder = requesterDisplay(grant.user);

  return (
    <TypedConfirmDialog
      open
      title={`Revoke ${grant.role}`}
      description={`${holder.label} loses ${grant.role}. ${REVOKE_SESSION_NOTE}${
        grant.isSelf ? ` ${REVOKE_SELF_WARNING}` : ''
      }`}
      objectName={grant.role}
      confirmLabel={submitting ? 'Revoking…' : 'Revoke role'}
      onConfirm={onConfirm}
      onCancel={onCancel}
      error={error}
    />
  );
}
