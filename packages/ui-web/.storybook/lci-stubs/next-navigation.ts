/**
 * `next/navigation` for Storybook.
 *
 * The real `useRouter()` throws outright when the App Router context is missing, and
 * `usePathname()` returns `null` — which is worse, because `RepoTabsNav` calls `.startsWith` on
 * it. Neither is recoverable from inside a story, so the module is aliased instead.
 *
 * `usePathname` is driven by a Storybook global rather than hardcoded, so a story that cares which
 * tab reads as active sets it with `withPathname('/repositories/1/graph')` from
 * `apps/lci/src/containers/story-fixtures.tsx`.
 */
/**
 * `usePathname()` reads a global that `withPathname()`
 * (`apps/lci/src/containers/story-fixtures.tsx`) sets before the story renders. A global rather
 * than an exported setter, because this file is reached through a bundler alias — an `apps/lci`
 * module importing a setter from `'next/navigation'` would not typecheck against the real
 * package's declarations.
 */
export function usePathname(): string {
  return (globalThis as { __LCI_STORYBOOK_PATHNAME__?: string }).__LCI_STORYBOOK_PATHNAME__ ?? '/';
}

export function useSearchParams(): URLSearchParams {
  return new URLSearchParams(
    typeof window === 'undefined' ? '' : window.location.search.replace(/^\?/, '')
  );
}

export function useParams(): Record<string, string> {
  return {};
}

/** Navigation is inert in a story — the preview iframe must not be steered away from the story. */
export function useRouter() {
  return {
    push: (href: string) => console.info(`[storybook] router.push(${href})`),
    replace: (href: string) => console.info(`[storybook] router.replace(${href})`),
    back: () => console.info('[storybook] router.back()'),
    forward: () => console.info('[storybook] router.forward()'),
    refresh: () => console.info('[storybook] router.refresh()'),
    prefetch: () => Promise.resolve(),
  };
}

export function redirect(href: string): never {
  throw new Error(`[storybook] redirect(${href}) — a story must not redirect`);
}

export function notFound(): never {
  throw new Error('[storybook] notFound() — a story must not 404');
}
