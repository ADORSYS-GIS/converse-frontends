import { describe, expect, it } from 'vitest';

import {
  buildCreateAccountInput,
  buildUpdateAccountNameInput,
  normalizeAccountName,
} from './build-create-account-input';

describe('normalizeAccountName', () => {
  it('keeps a real name, trimmed', () => {
    expect(normalizeAccountName('  Widgets Ltd  ')).toBe('Widgets Ltd');
  });

  it('normalises blank to null rather than rejecting it', () => {
    // Agreeing with the server, not inventing a stricter rule: `createAccount` /
    // `updateAccountName` normalise blank input to NULL themselves, and `accounts.name` carries
    // `CHECK (name IS NULL OR btrim(name) <> '')` — so `''` is not a value the column can hold.
    expect(normalizeAccountName('')).toBeNull();
  });

  it('normalises whitespace-only to null, exactly as `btrim` would', () => {
    expect(normalizeAccountName('   ')).toBeNull();
    expect(normalizeAccountName('\t\n ')).toBeNull();
  });
});

describe('buildCreateAccountInput', () => {
  it('never supplies an id — `accounts.id` is the caller JWT `sub`, read server-side', () => {
    const input = buildCreateAccountInput({ name: 'Widgets Ltd' });

    // The whole contrast with `buildCreateProjectInput`, which HAS to mint a `createId()`.
    // A regression here would mean the console started asserting an account id it does not own
    // (ADR-0006 / ADR-0039).
    expect(input).not.toHaveProperty('id');
    expect(Object.keys(input).sort()).toEqual(['defaultQuota', 'name']);
  });

  it('sends the trimmed name', () => {
    expect(buildCreateAccountInput({ name: '  Widgets Ltd ' }).name).toBe('Widgets Ltd');
  });

  it('sends null for a blank name, creating an unnamed account', () => {
    expect(buildCreateAccountInput({ name: '   ' }).name).toBeNull();
  });

  it('sends no guessed governance tier — there is no catalogue procedure to pick one from', () => {
    expect(buildCreateAccountInput({ name: 'Widgets Ltd' }).defaultQuota).toBeNull();
  });
});

describe('buildUpdateAccountNameInput', () => {
  it('carries the explicit accountId the procedure re-checks against auth().id', () => {
    expect(buildUpdateAccountNameInput({ accountId: 'auth0|9f3a', name: 'Widgets Ltd' })).toEqual({
      accountId: 'auth0|9f3a',
      name: 'Widgets Ltd',
    });
  });

  it('clears the name with null when the field is blanked — a set, not a PATCH', () => {
    expect(buildUpdateAccountNameInput({ accountId: 'auth0|9f3a', name: '  ' })).toEqual({
      accountId: 'auth0|9f3a',
      name: null,
    });
  });
});
