import { AuthView } from '../../../containers/auth-view';
import { getServerTranslation } from '../../../i18n/server';

export const dynamic = 'force-dynamic';

/** Where RP-initiated logout lands (`post_logout_redirect_uri`).
 *
 *  Async since ADR 0017: the sign-off line is copy, and this route sits OUTSIDE the `(console)`
 *  group — there is no client screen hook to read it from, so it resolves the request's own locale
 *  server-side (`lb.locale` cookie -> `Accept-Language` -> `en`) exactly as the root layout does. */
export default async function SignedOutRoute() {
  const { t } = await getServerTranslation(undefined, 'auth');
  return <AuthView signedOutMessage={t('signed-out')} />;
}
