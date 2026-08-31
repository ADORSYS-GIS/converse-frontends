import type { ReactNode } from 'react';

import { cn } from '@lightbridge/ui-web/src/cn';

// Plain Tailwind utilities + `packages/ui-web` semantic colour tokens (`surface`, `border`,
// `soft` -- console-ui skill "Tokens"), NOT daisyUI's `.alert` component class. Found by real CSP
// verification in lightbridge-authz PR #446: every daisyUI 5 component class in the
// `fx-noise`-referencing set (`alert`, `btn`, `badge`, `checkbox`, `radio`, `toggle`,
// `fileinput`, `menu`, `svg`) unconditionally sets `background-image: none, var(--fx-noise)` -- a
// `data:image/svg+xml` URI -- regardless of the active theme's `--noise` value (`--noise` only
// scales the *rendered size* of the effect, it does not gate whether the browser attempts to
// fetch the image at all). `default-src 'self'` has no `data:` carve-out (ADR-0021 Decision 10
// specifies exactly `default-src 'self'; frame-ancestors 'none'`, nothing more), so any of those
// component classes gets its background image blocked and logs a CSP violation on every load.
// Whether that verdict still holds under this repo's customized daisy themes is story #407's
// call; this scaffold adopts no daisyUI component class either way.
//
// The source app wrapped these classes in `cva` with a single `tone` variant that had a single
// value. That is not a variant set -- console-ui skill "Component conventions" reaches for `cva`
// only when a real multi-axis variant set survives -- so the classes are stated directly and
// `cva`/`clsx`/`tailwind-merge` are not app dependencies. `cn()` comes from `ui-web`.
interface NoticePanelProps {
  children: ReactNode;
  className?: string;
}

export function NoticePanel({ children, className }: NoticePanelProps) {
  return (
    <div className={cn('rounded-box border-border bg-surface text-soft border p-4', className)}>
      {children}
    </div>
  );
}
