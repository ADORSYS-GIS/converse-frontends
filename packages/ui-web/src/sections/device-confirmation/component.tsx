import React from 'react';

import { cn } from '../../cn';
import { ERROR_TEXT_CLASS, LABEL_CLASS, METRIC_CLASS, ROW_LABEL_CLASS } from '../../lib/type-roles';
import type { DeviceConfirmationProps } from './types';

// authz-idp's human plane (lightbridge-authz#478, converse-frontends#409) -- the device-pairing
// confirmation panel: what the deleted server-rendered confirmation HTML used to print, now
// fetched from `GET /device/verify/context` and rendered here. CSP-SAFE SECTION: native elements
// + token utilities ONLY -- see `csp-safe-sections.test.ts`.
//
// Display-formats the 8-char code as `XXXX-XXXX` for readability; the HIDDEN input carries the
// UNFORMATTED value verbatim (`device_store.rs`'s server normalises anyway, but sending exactly
// what was received removes a variable). Groups every 4 characters, which degrades gracefully for
// any length other than 8.
function formatUserCodeForDisplay(code: string): string {
  const groups = code.match(/.{1,4}/g) ?? [code];
  return groups.join('-');
}

export function DeviceConfirmation({
  status = 'ready',
  action,
  fieldName = 'user_code',
  userCode,
  clientName,
  errorMessage,
  continueLabel = 'Continue',
  backHref,
  className,
}: DeviceConfirmationProps) {
  if (status === 'loading') {
    return (
      <div className={cn('flex flex-col gap-4', className)} aria-busy="true">
        <div className="bg-raised h-[34px] w-[160px] rounded-[2px]" />
        <div className="bg-raised h-[14px] w-[120px] rounded-[2px]" />
        <div className="bg-raised h-[38px] w-full rounded-[2px]" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={cn('flex flex-col gap-4', className)}>
        <p role="alert" className={ERROR_TEXT_CLASS}>
          {errorMessage ?? 'This confirmation is no longer available.'}
        </p>
        {backHref ? (
          <a href={backHref} className={ROW_LABEL_CLASS}>
            Enter the code again
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <form method="post" action={action} className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-col gap-1">
        <span className={LABEL_CLASS}>Code</span>
        <span className={METRIC_CLASS}>{userCode ? formatUserCodeForDisplay(userCode) : ''}</span>
      </div>

      <div className="flex flex-col gap-1">
        <span className={LABEL_CLASS}>Requesting client</span>
        <span className={ROW_LABEL_CLASS}>{clientName}</span>
      </div>

      <input type="hidden" name={fieldName} value={userCode ?? ''} />

      <button
        type="submit"
        className="bg-primary text-primary-content rounded-field w-full px-4 py-2 font-sans text-[13px]">
        {continueLabel}
      </button>
    </form>
  );
}
