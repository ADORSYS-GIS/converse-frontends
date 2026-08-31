import { cn } from '../../cn';
import { BODY_CLASS, PAGE_TITLE_CLASS } from '../../lib/type-roles';
import type { AuthPanelShellProps } from './types';

// authz-idp's human plane (lightbridge-authz#478, converse-frontends#409) — the layout idiom the
// device-pairing pages share: full-bleed floor, wordmark row, one centred `max-w-[360px]` column.
// Geometry mirrors `sections/auth-screen/component.tsx`'s proven shape (`flex min-h-dvh flex-col
// bg-muted px-6`, `flex items-center gap-3 pt-6` wordmark row, `flex flex-1 items-center
// justify-center py-12` centre, `flex w-full max-w-[360px] flex-col gap-6` column) -- but
// `auth-screen` is a complete screen with its own copy and its own control, not a reusable shell,
// so this is a NEW section, not a fork or a refactor of it (plan D7).
//
// `min-h-dvh`, not `min-h-screen`: `apps/authz-ui/src/routes/placeholder-page.tsx` documents
// `min-h-dvh` as the class that proves authz-ui's own Tailwind pass compiled this app's own
// sources (rather than only reaching classes through `packages/ui-web`'s `@source`-less
// pass-through). Keeping every auth-plane page on `min-h-dvh` keeps that probe meaningful.
//
// CSP-SAFE SECTION — native elements + token utilities ONLY. See `csp-safe-sections.test.ts`.
export function AuthPanelShell({
  wordmark = 'LIGHTBRIDGE',
  title,
  lead,
  children,
  className,
}: AuthPanelShellProps) {
  return (
    <div className={cn('bg-muted flex min-h-dvh flex-col px-6', className)}>
      <div className="flex items-center gap-3 pt-6">
        <span className="text-ink font-sans text-xs">{wordmark}</span>
      </div>

      <div className="flex flex-1 items-center justify-center py-12">
        <div className="flex w-full max-w-[360px] flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className={PAGE_TITLE_CLASS}>{title}</h1>
            {lead ? <p className={BODY_CLASS}>{lead}</p> : null}
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
