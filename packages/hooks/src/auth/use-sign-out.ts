import { clearPersistedAuthSession } from './use-auth-session';

export function useSignOut() {
  const signOut = async () => {
    await clearPersistedAuthSession();
  };

  return { signOut };
}
