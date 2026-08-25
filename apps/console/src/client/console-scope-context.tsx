'use client';

import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

import { useConsoleScope, type ConsoleScope } from './use-console-scope';

/**
 * The account/project scope, hoisted to a context.
 *
 * It was a plain hook while each route mounted one monolithic page component. Now the shell is
 * mounted once and every route is split into a centre (`children`) and a rail (`@rail`), so two
 * separate subtrees read and write the same scope — the api-keys rail's `ScopeSelect` sets it, the
 * api-keys centre's ledger filters by it. Calling the hook twice would give them two independent
 * copies of that state.
 *
 * Mounted in `app/(console)/layout.tsx`, so the scope also survives navigation between routes:
 * picking a project on `/api-keys` and moving to `/manage` keeps the same scope, which is what the
 * shell's persistent left-rail SCOPE echo has always implied.
 */
const ConsoleScopeContext = createContext<ConsoleScope | null>(null);

export function ConsoleScopeProvider({ children }: { children: ReactNode }) {
  const scope = useConsoleScope();
  return <ConsoleScopeContext.Provider value={scope}>{children}</ConsoleScopeContext.Provider>;
}

export function useConsoleScopeContext(): ConsoleScope {
  const scope = useContext(ConsoleScopeContext);
  if (!scope) {
    throw new Error('useConsoleScopeContext must be used inside the (console) layout.');
  }
  return scope;
}
