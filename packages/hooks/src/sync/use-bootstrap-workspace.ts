import { useEffect, useRef } from 'react';

import { useAuthSession } from '../auth/use-auth-session';
import { useEnsureDefaultAccount } from '../accounts';
import { useEnsureDefaultProject } from '../projects';

/**
 * Ensures the authenticated user always has a default account and a default
 * project. Runs once per sign-in (keyed by the user id) after auth hydration.
 *
 * The underlying `useEnsureDefaultAccount` / `useEnsureDefaultProject` hooks
 * are idempotent: they list first and only create when the list is empty, so
 * re-running on a fresh sign-in is safe and cheap.
 *
 * `useCurrentAccount` / `useCurrentProject` pick up the newly created entries
 * automatically because the ensure hooks invalidate their query keys on
 * success — the first item in each list is treated as the default.
 */
export function useBootstrapWorkspace() {
  const { isAuthenticated, session } = useAuthSession();
  const { mutateAsync: ensureAccount } = useEnsureDefaultAccount();
  const { mutateAsync: ensureProject } = useEnsureDefaultProject();

  // Track which user we've already bootstrapped for so we don't re-run on
  // every render, but DO re-run if the user signs out and back in as a
  // different identity.
  const bootstrappedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !session.user) {
      bootstrappedFor.current = null;
      return;
    }

    const userId = session.user.id;
    if (bootstrappedFor.current === userId) {
      return;
    }

    let cancelled = false;

    const bootstrap = async () => {
      try {
        const account = await ensureAccount();
        if (cancelled || !account?.id) {
          return;
        }
        await ensureProject(account.id);
      } catch (error) {
        // Bootstrap failures must not crash the app — the user can still
        // navigate, and the lazy ensure in api-key-create-screen will retry.
        console.warn('[Bootstrap] Failed to ensure default workspace:', error);
      } finally {
        if (!cancelled) {
          bootstrappedFor.current = userId;
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, session.user, ensureAccount, ensureProject]);
}
