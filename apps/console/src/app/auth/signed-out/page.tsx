import { AuthView } from '../../../containers/auth-view';

export const dynamic = 'force-dynamic';

/** Where RP-initiated logout lands (`post_logout_redirect_uri`). */
export default function SignedOutRoute() {
  return <AuthView signedOutMessage="Your session ended · you are signed out" />;
}
