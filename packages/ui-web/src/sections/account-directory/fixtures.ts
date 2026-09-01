import type { AccountDirectoryRow } from './types';

const noop = () => {};

export const namedAccountRowFixture: AccountDirectoryRow = {
  id: 'auth0|9f3a2c7e41b0',
  label: 'Widgets Ltd',
  status: 'active',
  defaultQuotaTier: 'growth',
};

export const unnamedAccountRowFixture: AccountDirectoryRow = {
  id: 'auth0|1b77de04aa93',
  label: 'acct_1b77de04',
  status: 'active',
  defaultQuotaTier: null,
};

export const accountDirectoryFixture: AccountDirectoryRow[] = [
  namedAccountRowFixture,
  unnamedAccountRowFixture,
];

export const accountDirectoryPropsFixture = {
  accounts: accountDirectoryFixture,
  onRetry: noop,
  onCreate: noop,
  onSelectAccount: noop,
};
