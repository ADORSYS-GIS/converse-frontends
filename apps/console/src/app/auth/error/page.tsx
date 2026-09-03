import { AuthView } from '../../../containers/auth-view';
import { getServerTranslation } from '../../../i18n/server';

export const dynamic = 'force-dynamic';

/**
 * Login-failure reasons, rendered as sentences.
 *
 * The `reason` in the URL is a fixed vocabulary set by `/auth/callback`, and it is mapped through
 * this CLOSED LIST rather than printed: a raw OIDC error code is both meaningless to the reader
 * (the `AuthScreen` contract forbids it) and a reflected-content risk if it were echoed verbatim.
 * Anything unrecognised falls back to the generic sentence.
 *
 * ADR 0017 moved the sentences themselves into `locales/<locale>/auth.json`, but the list stays
 * HERE and stays closed — `t(\`error.${reason}\`)` with an unchecked `reason` would be a URL
 * parameter used as a lookup key, which is the same reflected-content hazard in a new place. The
 * membership test happens first; only then is a key built.
 */
const REASONS = [
  'discovery',
  'missing_state',
  'invalid_state',
  'audience',
  'exchange',
  'access_denied',
] as const;

/**
 * The provider's `error_description`, relayed by `/auth/callback` as `detail`. It is untrusted URL
 * content, so it renders only through this allow-list: a bounded length and a plain-prose charset —
 * enough for real IdP sentences ("Offline tokens not allowed for the user or client") while leaving
 * nothing for a crafted link to smuggle in. Anything that doesn't survive intact is dropped whole.
 */
function sanitizeDetail(detail: string | undefined): string | undefined {
  if (!detail) return undefined;
  const trimmed = detail.slice(0, 140).trim();
  return /^[A-Za-z0-9 .,:;_'()/-]+$/.test(trimmed) ? trimmed : undefined;
}

export default async function AuthErrorRoute({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; detail?: string }>;
}) {
  const { reason, detail } = await searchParams;
  const { t } = await getServerTranslation(undefined, 'auth');
  const known = REASONS.find((candidate) => candidate === reason);
  const sentence = known ? t(`error.${known}`) : t('error.fallback');
  const providerDetail = sanitizeDetail(detail);
  return (
    <AuthView
      status="error"
      errorMessage={
        providerDetail
          ? t('error.with-provider-detail', { sentence, detail: providerDetail })
          : sentence
      }
    />
  );
}
