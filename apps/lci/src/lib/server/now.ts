/**
 * The current timestamp, captured as an async read rather than a bare `Date.now()` call inside a
 * Server Component's render body. `apps/console`'s own convention (`use-api-keys-screen.ts` et
 * al.: "the fetch timestamp, not `Date.now()` — reading the clock during render is impure")
 * treats "now" as something fetched alongside the data it times, not read synchronously during
 * render — this is that fetch, trivial as it is.
 */
export async function now(): Promise<number> {
  return Date.now();
}
