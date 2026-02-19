import { createCollection, localOnlyCollectionOptions } from '@tanstack/react-db';

import type { AuthSession } from './auth-types';

const initialSession: AuthSession = {
  id: 'current',
  user: null,
  tokens: null,
};

export const authSessionCollection = createCollection(
  localOnlyCollectionOptions({
    id: 'auth-session',
    getKey: (item: AuthSession) => item.id,
    initialData: [initialSession],
  })
);

export function setAuthSession(next: AuthSession) {
  authSessionCollection.update('current', (draft) => {
    Object.assign(draft, next);
  });
}

export function clearAuthSession() {
  authSessionCollection.update('current', (draft) => {
    draft.user = null;
    draft.tokens = null;
  });
}
