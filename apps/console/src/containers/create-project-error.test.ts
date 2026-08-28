import { describe, expect, it } from 'vitest';

import { classifyCreateProjectError } from './create-project-error';

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
