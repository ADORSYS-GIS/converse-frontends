import React from 'react';

import { cn } from '../../cn';
import { ERROR_TEXT_CLASS, ROW_LABEL_CLASS } from '../../lib/type-roles';
import type { AuthErrorPanelProps } from './types';

// authz-idp's human plane (lightbridge-authz#478, converse-frontends#409) -- the generic RP-leg
// failure panel: what `generic_failure`'s server-rendered HTML used to print (D8: every RP-leg
// human response is now a 303 into `/ui/error`, with the distinction preserved in logs, not in
// HTTP). CSP-SAFE SECTION: native elements + token utilities ONLY -- see
// `csp-safe-sections.test.ts`.
//
// `retryHref` renders a plain `<a>`, never a `Button` -- it is navigation (a fresh `GET`), not an
// action with side effects, and a link is the honest native element for that.
export function AuthErrorPanel({
  message = 'Unable to complete sign-in. Please try again.',
  retryHref,
  retryLabel = 'Start over',
  className,
}: AuthErrorPanelProps) {
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <p role="alert" className={ERROR_TEXT_CLASS}>
        {message}
      </p>
      {retryHref ? (
        <a href={retryHref} className={ROW_LABEL_CLASS}>
          {retryLabel}
        </a>
      ) : null}
    </div>
  );
}
