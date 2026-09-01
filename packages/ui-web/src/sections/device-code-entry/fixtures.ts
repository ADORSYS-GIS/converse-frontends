// Realistic mock data for `DeviceCodeEntry` stories/tests -- console-ui skill "Composition".
// `device_store.rs`'s USER_CODE_ALPHABET is Crockford-style (no I, L, O, U); the display
// separator is a hyphen, matching the SPA's own `sanitiseUserCode` contract.

export const deviceCodeEntryAction = '/device/verify';

export const deviceCodeEntryPrefilledCode = 'WDJB-MJHT';

export const deviceCodeEntryInvalidCodeMessage = 'That code cannot be used.';
