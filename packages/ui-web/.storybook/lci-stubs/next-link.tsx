/**
 * `next/link` for Storybook.
 *
 * `apps/lci`'s screens are ordinary presentational components (props in, JSX out — ADR 0014 keeps
 * them app-local rather than moving them into `ui-web`), but a handful of them render `next/link`
 * for in-app navigation. The real `Link` reads Next's App Router context, which does not exist in
 * a `@storybook/react-vite` iframe. This is the whole substitute: an `<a>` that swallows the
 * click, so a story shows the real link affordance without navigating the preview iframe away.
 */
import React from 'react';

type LinkProps = Omit<React.ComponentPropsWithoutRef<'a'>, 'href'> & {
  href: string | { pathname?: string };
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
  shallow?: boolean;
};

const NextLink = React.forwardRef<HTMLAnchorElement, LinkProps>(function NextLink(
  { href, prefetch: _prefetch, replace: _replace, scroll: _scroll, shallow: _shallow, ...rest },
  ref
) {
  const resolved = typeof href === 'string' ? href : (href?.pathname ?? '#');
  return (
    // `rest` carries `children` (this is a pass-through stub, not a leaf), which the rule cannot
    // see through a spread — the same false positive Base UI's `render` prop produces.
    // eslint-disable-next-line jsx-a11y/anchor-has-content
    <a
      {...rest}
      ref={ref}
      href={resolved}
      onClick={(event) => {
        event.preventDefault();
        rest.onClick?.(event);
      }}
    />
  );
});

export default NextLink;
