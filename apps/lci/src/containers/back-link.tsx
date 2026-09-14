import { BackIcon } from '@lightbridge/ui-web/src/lib/icons';
import Link from 'next/link';

/** A small "go back" affordance above a detail page's `PageHeader`, for a screen reached by
 *  drilling into a list — the sidebar has no "up one level" of its own. */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-subtle hover:text-ink inline-flex w-fit items-center gap-1.5 font-sans text-[13px]">
      <BackIcon />
      {label}
    </Link>
  );
}
