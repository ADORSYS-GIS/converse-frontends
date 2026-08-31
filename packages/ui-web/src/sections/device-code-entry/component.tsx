import { cn } from '../../cn';
import { DATA_INK_CLASS, ERROR_TEXT_CLASS, LABEL_CLASS } from '../../lib/type-roles';
import type { DeviceCodeEntryProps } from './types';

// authz-idp's human plane (lightbridge-authz#478, converse-frontends#409) -- the device-pairing
// code-entry form. CSP-SAFE SECTION: native elements + token utilities ONLY, no ui-web `Button`,
// no `ErrorLine`, no daisy component class -- see `csp-safe-sections.test.ts` and this package's
// `index.ts` "sections" region comment for why.
//
// `<form method="post" action={action}>` is a PLAIN browser form, deliberately not react-router's
// `<Form>` -- that intercepts submission client-side, and this must be a real browser navigation
// so the server's 303 drives the flow (lightbridge-authz's `verify_submit`/`verify_continue`).
//
// `autoComplete="one-time-code"` is the live wire contract (converse-frontends#409 quotes it
// explicitly) -- password managers and OS autofill key off this exact value for OTP-shaped
// fields.
//
// The error line renders ABOVE the field (auth-screen's own phase-7 precedent: reason before
// decision) as a plain `<p role="alert">`, never `ErrorLine` -- that component drags in `Button`
// through its `onRetry` prop, which is a daisy `btn` (D6).
export function DeviceCodeEntry({
  action,
  fieldName = 'user_code',
  defaultUserCode,
  errorMessage,
  submitLabel = 'Continue',
  className,
}: DeviceCodeEntryProps) {
  return (
    <form method="post" action={action} className={cn('flex flex-col gap-4', className)}>
      {errorMessage ? (
        <p role="alert" className={ERROR_TEXT_CLASS}>
          {errorMessage}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <label htmlFor="device-code-entry-field" className={LABEL_CLASS}>
          Device code
        </label>
        <input
          id="device-code-entry-field"
          name={fieldName}
          autoComplete="one-time-code"
          required
          defaultValue={defaultUserCode}
          inputMode="text"
          autoCapitalize="characters"
          spellCheck={false}
          className={cn(
            DATA_INK_CLASS,
            'border-border bg-chrome rounded-field w-full border px-3 py-2'
          )}
        />
      </div>

      <button
        type="submit"
        className="bg-primary text-primary-content rounded-field w-full px-4 py-2 font-sans text-[13px]">
        {submitLabel}
      </button>
    </form>
  );
}
