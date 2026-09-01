import type { ReactNode } from 'react';

import { LciShell } from '../../client/lci-shell';
import { currentClaims, displayName } from '../../lib/server/session';

/**
 * Server wrapper for the `(lci)` route group: reads the session once (the proxy already
 * guarantees a valid one for every route this group covers) and hands the display name down to
 * the client shell. The shell itself (`LciShell`) is a client component — `ConsoleShell`'s
 * interactive chrome (palette, theme toggle) needs to be.
 */
export default async function LciLayout({ children }: { children: ReactNode }) {
  const claims = await currentClaims();
  const userLabel = claims ? displayName(claims) : 'Signed in';

  return <LciShell userLabel={userLabel}>{children}</LciShell>;
}
