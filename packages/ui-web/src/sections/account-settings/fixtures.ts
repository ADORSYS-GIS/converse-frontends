// The account states `/settings` has to render. Deliberately built from real shapes: `id` is an
// opaque string (a JWT subject for a person's first/home account per ADR-0006, a server-minted id
// for any account after that per ADR-0026), `defaultQuotaTier` is a catalogue tier id and not a
// currency figure, and the unnamed account is the COMMON case in production today, not an edge
// one — `Account.name` shipped nullable with no truthful backfill (lightbridge-authz#551).
import type { AccountSettingsDetails, AccountSettingsPanel } from './types';

const noop = () => {};

export const namedAccountPanelFixture: AccountSettingsPanel = {
  account: { id: 'auth0|9f3a2c7e41b0', name: 'Widgets Ltd' },
  loading: false,
  onCreate: noop,
  onRename: noop,
  onRetry: noop,
};

export const unnamedAccountPanelFixture: AccountSettingsPanel = {
  ...namedAccountPanelFixture,
  account: { id: 'auth0|1b77de04aa93', name: null },
};

export const noAccountPanelFixture: AccountSettingsPanel = {
  ...namedAccountPanelFixture,
  account: null,
};

export const accountDetailsFixture: AccountSettingsDetails = {
  id: 'auth0|9f3a2c7e41b0',
  status: 'active',
  defaultQuotaTier: 'growth',
};

/** What an account created through this console actually looks like: no tier assigned — the
 *  create input sends `null` because no procedure exposes the tier catalogue. */
export const accountDetailsNoQuotaFixture: AccountSettingsDetails = {
  id: 'auth0|1b77de04aa93',
  status: 'active',
  defaultQuotaTier: null,
};
