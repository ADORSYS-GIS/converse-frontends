import { describe, expect, it } from 'vitest';

import { UNNAMED_ACCOUNT_LABEL, accountScopeLabel } from './account-label';

describe('accountScopeLabel', () => {
  it('shows a named account by its name alone', () => {
    expect(accountScopeLabel({ id: 'auth0|9f3a', name: 'Widgets Ltd' })).toBe('Widgets Ltd');
  });

  it('never silently substitutes the full id for a missing name', () => {
    // The defect `Account.name` exists to fix: if `null` rendered as the raw id, the console
    // could not tell "the user named their account <id>" from "nobody has named it yet", and
    // would have no basis for offering a naming affordance. It must also never leak the full
    // 36-character UUID inline (live findings #2) — only the short `acct_` token.
    const id = '97de3164-9c1d-4af2-8a71-11572288b729';
    const label = accountScopeLabel({ id, name: null });
    expect(label).not.toBe(id);
    expect(label).not.toContain(id);
  });

  it('renders an unnamed account as the short acct_ token, not the full uuid', () => {
    expect(accountScopeLabel({ id: '97de3164-9c1d-4af2-8a71-11572288b729', name: null })).toBe(
      'acct_97de3164'
    );
  });

  it('keeps two unnamed accounts distinguishable from each other', () => {
    expect(accountScopeLabel({ id: '97de3164-9c1d-4af2-8a71-11572288b729', name: null })).not.toBe(
      accountScopeLabel({ id: 'a1de3164-9c1d-4af2-8a71-11572288b729', name: null })
    );
  });

  it('treats an absent `name` property the same as an explicit null', () => {
    // The generated `Account` type is `name?: string | null`, so both shapes reach this function.
    expect(accountScopeLabel({ id: '97de3164-9c1d-4af2-8a71-11572288b729' })).toBe('acct_97de3164');
  });

  it('still exports the long-form headline for the account settings screen', () => {
    expect(UNNAMED_ACCOUNT_LABEL).toBe('Unnamed account');
  });
});
