export interface DeviceCodeEntryProps {
  /** Native form target — an absolute origin path supplied by the app. NEVER hardcoded here. */
  action: string;
  /** Form field name the server parses. Defaults to the live Rust contract's `user_code`. */
  fieldName?: string;
  /** Pre-filled value (RFC 8628 `verification_uri_complete`). Already sanitised by the caller. */
  defaultUserCode?: string;
  /** Sentence-case failure line above the field. Never a raw error code. */
  errorMessage?: string;
  submitLabel?: string;
  className?: string;
}
