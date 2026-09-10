import { Combobox } from '@base-ui/react/combobox';
import { Dialog } from '@base-ui/react/dialog';
import { Field as BaseField } from '@base-ui/react/field';
import React from 'react';

import { Button } from '../../components/button';
import { ErrorLine } from '../../components/error-line';
import { Field } from '../../components/field';
import { fieldControlClassName, fieldLabelClassName } from '../../components/field/field-classes';
import { InlineStatus } from '../../components/inline-status';
import { SelectField } from '../../components/select-field';
import {
  DIALOG_ACTIONS_CLASS,
  DIALOG_BACKDROP_CLASS,
  DIALOG_BODY_CLASS,
  DIALOG_DESCRIPTION_CLASS,
  DIALOG_ERROR_CLASS,
  DIALOG_POPUP_CLASS,
  DIALOG_TITLE_CLASS,
} from '../../lib/dialog';
import {
  OVERLAY_ANCHORED_POPUP_FLOATING_CLASS,
  OVERLAY_ITEM_CLASS,
  OVERLAY_POSITIONER_CLASS,
} from '../../lib/overlay';
import { META_CLASS } from '../../lib/type-roles';
import type { GrantRoleDialogProps, GrantUserOption } from './types';

/**
 * The token-mint delay, stated in the dialog rather than only in the docs.
 *
 * `grantPlatformRole` writes a row; the roles claim is stamped at MINT
 * (`ClaimSource::PlatformRoles`), so the person keeps whatever their current access token says
 * until it is next refreshed. Claiming immediate effect would be the console asserting something
 * the backend explicitly does not promise — converse-frontends#452 negative AC 4 makes saying so a
 * requirement, not a nicety. Grants deliberately do NOT revoke sessions (revocations do): gaining
 * a capability late is not a security event, and signing someone out to hand them a role would be
 * a hostile way to do it.
 */
export const GRANT_MINT_DELAY_NOTE =
  'The role reaches them at their next token mint — up to one access-token lifetime from now. ' +
  'Granting does not sign them out.';

/** What the combobox's `items` are: Base UI's own `{value,label}` item shape, plus the email the
 *  option row renders as its second line. Extra fields ride along untouched. */
type UserItem = { value: string; label: string; email?: string };

function toItem(user: GrantUserOption): UserItem {
  return { value: user.userId, label: user.label, email: user.email };
}

/**
 * "Grant a platform role" — one of the two mutations `/admin/roles` offers.
 *
 * **Three fields, in the order the decision is actually made:** who, which role, and why.
 *
 * The person picker is a Base UI `Combobox` with `filter={null}` — the console's own primitive
 * (ADR 0010: Base UI for behaviour), in the same single-select shape `ProjectPolicyControls`
 * already uses in `multiple` mode, rather than a hand-rolled input-plus-listbox. `filter={null}`
 * is the load-bearing prop: the list is not a local catalogue to narrow, it is `searchUsers`'
 * answer, already ordered server-side (prefix matches before substring, then display name, then
 * `userId`) — re-filtering it in the browser would silently drop rows the backend deliberately
 * returned.
 *
 * `searchUsers` REFUSES a query shorter than two characters (a one-character substring search over
 * `federated_identities` is a table dump with extra steps), so the control states its own minimum
 * and distinguishes four states out loud: not enough typed yet, searching, the search itself
 * failed, and a genuinely empty result. A plain dropdown can express none of them.
 *
 * The role comes from `roles` — the console's `PLATFORM_ROLES`, stated in ONE place, because no
 * procedure returns the deployment's catalogue: it is `oauth2.rbac.role_permissions` config, which
 * `grantPlatformRole` validates against and refuses an unknown role for.
 *
 * `reason` is optional on the wire but always ASKED for here: the whole point of
 * `platform_role_grants` being a table rather than a claim mapper is that a grant has a granter, a
 * timestamp and a stated reason. Leaving it blank stays allowed; leaving the field out would have
 * quietly made blank the default.
 */
export function GrantRoleDialog({
  open,
  query,
  onQueryChange,
  minQueryLength,
  results,
  searching,
  searchError,
  selectedUser,
  onSelectUser,
  role,
  onRoleChange,
  roles,
  reason,
  onReasonChange,
  submitting,
  error,
  onSubmit,
  onCancel,
}: GrantRoleDialogProps) {
  const items = results.map(toItem);
  const tooShort = query.trim().length < minQueryLength;
  const byId = new Map(results.map((user) => [user.userId, user]));

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel();
      }}>
      <Dialog.Portal>
        <Dialog.Backdrop className={DIALOG_BACKDROP_CLASS} />
        <Dialog.Popup className={DIALOG_POPUP_CLASS}>
          <Dialog.Title className={DIALOG_TITLE_CLASS}>Grant a platform role</Dialog.Title>
          <Dialog.Description className={DIALOG_DESCRIPTION_CLASS}>
            A platform role follows the person across every account they own.
          </Dialog.Description>

          <div className={DIALOG_BODY_CLASS}>
            <Combobox.Root
              items={items}
              filter={null}
              value={selectedUser ? selectedUser.userId : null}
              onValueChange={(next) => {
                // `null` is a real outcome (the input cleared), not an error — it puts the dialog
                // back into "no person chosen", which is exactly what the submit gate reads.
                onSelectUser(typeof next === 'string' ? (byId.get(next) ?? null) : null);
              }}
              inputValue={query}
              onInputValueChange={onQueryChange}>
              <BaseField.Root className="fieldset">
                <BaseField.Label className={fieldLabelClassName}>Person</BaseField.Label>
                {/* `fieldControlClassName` (daisy's `input`, the console's ONE control
                    treatment), NOT `combobox-input`: that class deliberately strips the border and
                    fill because `ProjectPolicyControls` nests its input INSIDE `Combobox.Chips`,
                    which draws the chrome around the whole chip row. This picker is single-select
                    with no chip row, so the input IS the control and has to wear the same box
                    every `Field` in the dialog does — otherwise it reads as unstyled text sitting
                    above a properly-drawn Reason textarea. */}
                <Combobox.Input
                  placeholder="Search by name, email or username"
                  className={fieldControlClassName}
                />
              </BaseField.Root>
              <Combobox.Portal>
                <Combobox.Positioner sideOffset={4} className={OVERLAY_POSITIONER_CLASS}>
                  <Combobox.Popup className={OVERLAY_ANCHORED_POPUP_FLOATING_CLASS}>
                    <Combobox.List>
                      {(item: UserItem) => (
                        <Combobox.Item
                          key={item.value}
                          value={item.value}
                          className={OVERLAY_ITEM_CLASS}>
                          <span className="flex flex-col">
                            <span>{item.label}</span>
                            {/* The email is what tells two people with the same display name
                                apart, so it belongs in the option, not in a tooltip. Absent when
                                the identity genuinely carries none — never a fabricated stand-in. */}
                            {item.email ? <span className={META_CLASS}>{item.email}</span> : null}
                          </span>
                        </Combobox.Item>
                      )}
                    </Combobox.List>
                  </Combobox.Popup>
                </Combobox.Positioner>
              </Combobox.Portal>
            </Combobox.Root>

            {/* The picker's four states, said out loud beneath it rather than collapsed into one
                silent empty list. Ordered by precedence: a failed search is not "no matches", and
                neither is a query the backend will not even accept yet. */}
            {selectedUser ? (
              selectedUser.email ? (
                <p className={META_CLASS}>{selectedUser.email}</p>
              ) : null
            ) : tooShort ? (
              <p className={META_CLASS}>
                Type at least {minQueryLength} characters to search the user directory.
              </p>
            ) : searchError ? (
              <ErrorLine message={searchError} />
            ) : searching ? (
              <InlineStatus>Searching…</InlineStatus>
            ) : results.length === 0 ? (
              <InlineStatus>No person matches “{query.trim()}”.</InlineStatus>
            ) : null}

            <SelectField
              label="Role"
              value={role}
              options={roles.map((entry) => ({ value: entry, label: entry }))}
              onChange={onRoleChange}
            />

            <Field
              multiline
              label="Reason"
              example="e.g. on-call operator for the September budget review"
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
            />

            <p className={META_CLASS}>{GRANT_MINT_DELAY_NOTE}</p>
          </div>

          {error ? (
            <p className={DIALOG_ERROR_CLASS} role="alert">
              {error}
            </p>
          ) : null}

          <div className={DIALOG_ACTIONS_CLASS}>
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={selectedUser === null || role === '' || submitting}
              onClick={onSubmit}>
              {submitting ? 'Granting…' : 'Grant role'}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
