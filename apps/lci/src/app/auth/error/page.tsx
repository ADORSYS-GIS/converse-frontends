import { Button } from '@lightbridge/ui-web/src/components/button';
import { ERROR_TEXT_CLASS, PAGE_TITLE_CLASS } from '@lightbridge/ui-web/src/lib/type-roles';

/**
 * Where `/auth/callback` sends a failed login — outside the `(lci)` shell group, same as the
 * OIDC routes themselves. There is no separate "click to sign in" landing page: auth is Keycloak
 * end to end, and every unauthenticated request already redirects straight to `/auth/login` (see
 * `proxy.ts`); this page exists only because a failed callback has to land somewhere other than a
 * bare redirect loop.
 *
 * A plain `<p>` rather than `ui-web`'s `ErrorLine`: that component calls `useCopy()` with no
 * `'use client'` directive of its own, so it only works when some ancestor has already crossed
 * into a client boundary. This page is a bare server component with no such ancestor (there is
 * nothing above it but the root layout), so `ErrorLine` would render as a Server Component here
 * and crash calling a client-only hook.
 */
const MESSAGES: Record<string, string> = {
  missing_state: 'Your sign-in session expired before it could complete.',
  exchange_failed: "Sign-in didn't complete. Please try again.",
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message = (error && MESSAGES[error]) || "Sign-in didn't complete. Please try again.";

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className={PAGE_TITLE_CLASS}>Lightbridge Code Intelligence</h1>
      <p className={ERROR_TEXT_CLASS}>{message}</p>
      <Button
        variant="primary"
        render={
          // eslint-disable-next-line jsx-a11y/anchor-has-content, jsx-a11y/control-has-associated-label
          <a href="/auth/login" />
        }
        nativeButton={false}>
        Try again
      </Button>
    </div>
  );
}
