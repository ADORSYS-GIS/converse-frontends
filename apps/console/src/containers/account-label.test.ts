import { describe, expect, it } from 'vitest';

import { UNNAMED_ACCOUNT_LABEL, accountScopeLabel } from './account-label';

describe('accountScopeLabel', () => {
  it('shows a named account by its name alone', () => {
    expect(accountScopeLabel({ id: 'auth0|9f3a', name: 'Widgets Ltd' })).toBe('Widgets Ltd');
  });

  it('never silently substitutes the id for a missing name', () => {
    // The defect `Account.name` exists to fix: if `null` rendered as the id, the console could not
    // tell "the user named their account auth0|9f3a" from "nobody has named it yet", and would
    // have no basis for offering a naming affordance.
    expect(accountScopeLabel({ id: 'auth0|9f3a', name: null })).not.toBe('auth0|9f3a');
  });

  it('names the absence and keeps the id, so the option stays selectable and unambiguous', () => {
    expect(accountScopeLabel({ id: 'auth0|9f3a', name: null })).toBe(
      `${UNNAMED_ACCOUNT_LABEL} · auth0|9f3a`
    );
  });

  it('keeps two unnamed accounts distinguishable from each other', () => {
    expect(accountScopeLabel({ id: 'auth0|a', name: null })).not.toBe(
      accountScopeLabel({ id: 'auth0|b', name: null })
    );
  });

  it('treats an absent `name` property the same as an explicit null', () => {
    // The generated `Account` type is `name?: string | null`, so both shapes reach this function.
    expect(accountScopeLabel({ id: 'auth0|9f3a' })).toBe(`${UNNAMED_ACCOUNT_LABEL} · auth0|9f3a`);
  });
});
