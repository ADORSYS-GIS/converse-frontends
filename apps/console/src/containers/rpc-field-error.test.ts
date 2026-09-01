import { describe, expect, it } from 'vitest';

import { classifyCreateAccountError, classifyCreateProjectError } from './rpc-field-error';

describe('classifyCreateProjectError', () => {
  it('routes a billing_identity uniqueness message to billingIdentityError', () => {
    const message =
      'duplicate key value violates unique constraint "projects_billing_identity_key"';
    expect(classifyCreateProjectError(message)).toEqual({ billingIdentityError: message });
  });

  it('routes a friendlier "billing identity" message to billingIdentityError too', () => {
    const message = 'billing identity "widgets-prod-billing" is already in use';
    expect(classifyCreateProjectError(message)).toEqual({ billingIdentityError: message });
  });

  it('routes a name-related message to nameError', () => {
    const message = 'a project named "widgets-prod" already exists on this account';
    expect(classifyCreateProjectError(message)).toEqual({ nameError: message });
  });

  it('falls back to a general error when neither field is nameable from the text', () => {
    const message = 'Something went wrong. Please try again.';
    expect(classifyCreateProjectError(message)).toEqual({ error: message });
  });

  it('prefers billing identity over name when the message mentions both', () => {
    // Guards against a message like "billing identity has an invalid name" being misrouted.
    const message = 'billing identity has an invalid name';
    expect(classifyCreateProjectError(message)).toEqual({ billingIdentityError: message });
  });
});

describe('classifyCreateAccountError', () => {
  it('routes a name-related rejection onto the dialog field', () => {
    const message = 'account name must not be blank once set';
    expect(classifyCreateAccountError(message)).toEqual({ nameError: message });
  });

  it('keeps the already-exists conflict OFF the name field', () => {
    // ADR-0026 narrowed `createAccount`'s `Error::Conflict` down to one rare race (two concurrent
    // bootstraps for the same identity's very first account) — nothing about the typed name is
    // ever wrong in that case, so attributing it to the field would tell the user to fix the one
    // thing that is not the problem.
    const message = 'account already exists for this subject';
    expect(classifyCreateAccountError(message)).toEqual({ error: message });
  });

  it('keeps a conflict off the field even when the message also says "name"', () => {
    const message = 'an account already exists for this subject, named Widgets Ltd';
    expect(classifyCreateAccountError(message)).toEqual({ error: message });
  });

  it('falls back to a general error rather than dropping an unattributable message', () => {
    const message = 'Something went wrong. Please try again.';
    expect(classifyCreateAccountError(message)).toEqual({ error: message });
  });
});
