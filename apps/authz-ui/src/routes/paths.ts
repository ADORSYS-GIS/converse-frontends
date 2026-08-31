// authz-idp's ORIGIN-ROOT protocol endpoints — deliberately NOT under /ui. `/ui` is the human
// plane; these are the protocol plane, and lightbridge-authz's config validation pins
// `/device/verify` as an exact path (lib.rs's device_verification_uri check), so it can never
// move under the prefix. Native form `action`s and the context fetch use these verbatim.
export const DEVICE_VERIFY_SUBMIT_PATH = '/device/verify';
export const DEVICE_VERIFY_CONTINUE_PATH = '/device/verify/continue';
export const DEVICE_VERIFY_CONTEXT_PATH = '/device/verify/context';
