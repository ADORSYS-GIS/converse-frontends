import { AuthView } from '../../../containers/auth-view';

export const dynamic = 'force-dynamic';

/**
 * Login-failure reasons, rendered as sentences.
 *
 * The `reason` in the URL is a fixed vocabulary set by `/auth/callback`, and it is mapped through
 * this table rather than printed: a raw OIDC error code is both meaningless to the reader (the
 * `AuthPage` contract forbids it) and a reflected-content risk if it were echoed verbatim. Anything
 * unrecognised falls back to the generic sentence.
 */
const REASONS: Record<string, string> = {
  discovery: 'The identity provider could not be reached. Try again in a moment.',
  missing_state: 'That sign-in link has expired. Start again.',
  invalid_state: 'That sign-in link could not be verified. Start again.',
  audience: 'Your account is not authorised for this console.',
  exchange: 'The identity provider rejected the sign-in. Try again.',
  access_denied: 'Sign-in was cancelled.',
};

const FALLBACK = 'Sign-in did not complete. Try again.';

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
  const sentence = (reason && REASONS[reason]) || FALLBACK;
  const providerDetail = sanitizeDetail(detail);
  return (
    <AuthView
      status="error"
      errorMessage={providerDetail ? `${sentence} (provider: ${providerDetail})` : sentence}
    />
  );
}
