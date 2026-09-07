import { Button } from '@lightbridge/ui-web/src/components/button';
import { PAGE_TITLE_CLASS } from '@lightbridge/ui-web/src/lib/type-roles';

/** Unauthenticated landing — outside the `(lci)` shell group, same as `apps/console`'s
 *  `app/auth/*` pages render with no sidebar. Auth is Keycloak OIDC end to end; this page holds
 *  no credentials of its own. Title and one control, no explainer paragraph underneath — matching
 *  `apps/console`'s own `AuthScreen`, whose only line of prose says what happens next
 *  ("you'll be redirected there and back"), not what the product does. */
export default function SignInPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className={PAGE_TITLE_CLASS}>Lightbridge Code Intelligence</h1>
      <Button
        variant="primary"
        render={
          // Base UI `render` takes a template that is cloned WITH this Button's children — see
          // `packages/ui-web/src/components/button/component.tsx`'s note on these two rules.
          // eslint-disable-next-line jsx-a11y/anchor-has-content, jsx-a11y/control-has-associated-label
          <a href="/api/auth/login" />
        }
        nativeButton={false}>
        Continue with Keycloak
      </Button>
    </div>
  );
}
