import type { ComponentType, ReactNode } from 'react';

/**
 * Props any navigation row (`NavSpine`, `SubNav`) passes to whatever renders its `href` items.
 *
 * `ui-web` stays framework-agnostic — it never imports `next/link` — but a plain `<a href>` is a
 * FULL DOCUMENT RELOAD in a Next.js App Router app: the router only intercepts clicks on its own
 * `<Link>`, never on bare anchors. That was the actual cause of the console's black flash between
 * routes (not just a missing `loading.tsx`): every left-nav click tore down and re-fetched the
 * entire document, shell included, discarding the persistent-layout architecture the console-ui
 * skill's "Composition" section describes.
 *
 * The fix is this injection seam: consumers that DO have a router-aware `Link` (`apps/console`
 * passing `next/link`) pass it as `linkComponent`; the default (`DefaultAnchor`, a plain `<a>`)
 * keeps every other consumer — Storybook, tests, a future non-Next host — working exactly as
 * before.
 */
export interface LinkComponentProps {
  href: string;
  className?: string;
  children: ReactNode;
  'aria-current'?: 'page' | undefined;
  onClick?: () => void;
}

export type LinkComponent = ComponentType<LinkComponentProps>;

/** Default `linkComponent`: a plain anchor, identical to what every row rendered before this seam existed. */
export function DefaultAnchor({ href, className, children, onClick, ...rest }: LinkComponentProps) {
  return (
    <a href={href} className={className} onClick={onClick} {...rest}>
      {children}
    </a>
  );
}
