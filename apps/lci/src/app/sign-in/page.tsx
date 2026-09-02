import { Button } from '@lightbridge/ui-web/src/components/button';
import { BODY_CLASS, PAGE_TITLE_CLASS } from '@lightbridge/ui-web/src/lib/type-roles';

/** Unauthenticated landing — outside the `(lci)` shell group, same as `apps/console`'s
 *  `app/auth/*` pages render with no sidebar. Auth is Keycloak OIDC end to end; this page holds
 *  no credentials of its own. */
export default function SignInPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className={PAGE_TITLE_CLASS}>Lightbridge Code Intelligence</h1>
      <p className={`${BODY_CLASS} max-w-sm`}>
        Repository-aware code review and Q&amp;A. Sign in with your Lightbridge identity to see task
        runs across your connected repositories.
      </p>
      <Button variant="primary" render={<a href="/api/auth/login" />} nativeButton={false}>
        Continue with Keycloak
      </Button>
    </div>
  );
}
