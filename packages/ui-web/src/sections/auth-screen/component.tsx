import React from 'react';

import { cn } from '../../cn';
import { Button } from '../../components/button';
import { ErrorLine } from '../../components/error-line';
import { InlineStatus } from '../../components/inline-status';
import type { AuthScreenProps } from './types';

// Contract: docs/design/console-redesign/README.md §5.5 (Auth) — a screen section that lives outside the shell entirely,
// no rails, no nav-spine group (ADR 0008 D3 status-block amendment + README §10 tension 7).
// `#000` full-bleed, logo top-left, one centred narrow column: wordmark -> page-title -> one
// line of Inter prose -> one primary button -> nothing else.
//
// **Recorded divergence**: ADR 0007's `maxContentWidth` (1040px) token is repurposed here as
// "the Auth page's column cap" (ADR 0008 status block), but 1040px is not a "centred single
// column" figure for a login card -- it is the old app's full body width. README §5.5 gives the
// concrete number directly ("Centred single column, max 360px"), which is what a login column
// actually reads as narrow at. This component caps at the spec's literal 360px rather than the
// historical 1040px token value; noted here and in the PR body per the batch brief's
// spec-vs-mockup tie-break rule.
export function AuthScreen({
  logoSrc,
  logoAlt = 'Lightbridge',
  wordmark = 'LIGHTBRIDGE',
  status = 'idle',
  onSignIn,
  signedOutMessage,
  errorMessage,
  onRetry,
  className,
}: AuthScreenProps) {
  const redirecting = status === 'redirecting';
  const hasError = status === 'error';

  return (
    <div className={cn('flex min-h-screen flex-col bg-muted px-6', className)}>
      <div className="flex items-center gap-3 pt-6">
        {logoSrc ? (
          <img src={logoSrc} alt={logoAlt} className="h-5 w-5 rounded-[2px]" />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-5 w-5 items-center justify-center rounded-[2px] bg-raised"
          >
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path d="M1 9 L5 1 L9 9 Z" fill="none" stroke="currentColor" className="text-subtle" />
            </svg>
          </span>
        )}
        <span className="font-mono text-xs tracking-[.14em] text-ink">{wordmark}</span>
      </div>

      <div className="flex flex-1 items-center justify-center py-12">
        <div className="flex w-full max-w-[360px] flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="font-mono text-[22px] leading-[1.25] text-ink">Sign in to Lightbridge</h1>
            <p className="font-sans text-[11px] leading-[1.45] text-soft">
              Sign-in happens at your identity provider — you&rsquo;ll be redirected there and
              back.
            </p>
          </div>

          {signedOutMessage ? (
            <InlineStatus className="text-subtle">{signedOutMessage}</InlineStatus>
          ) : null}

          <Button
            type="button"
            variant="primary"
            className="w-full"
            disabled={redirecting}
            onClick={onSignIn}
          >
            {redirecting ? 'Redirecting…' : 'Continue to sign in'}
          </Button>

          {hasError ? (
            <ErrorLine
              message={errorMessage ?? 'Sign-in failed. Please try again.'}
              onRetry={onRetry}
              retryLabel="Try again"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
