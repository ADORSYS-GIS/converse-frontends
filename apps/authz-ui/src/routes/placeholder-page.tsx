import { NoticePanel } from '../components/notice-panel';
import { ScopeDisclosure } from '../components/scope-disclosure';

// PLACEHOLDER PAGE -- the SPA's `/` route (plan D2: kept, not redirected -- a visitor who isn't
// mid device-pairing must not be dropped into a device flow, and `idp_it.py` plus
// `ui_bare_and_trailing_slash_both_serve_index_html` both require `GET /ui/` to stay 200 HTML).
// This app now implements the RFC 8628 device-pairing human plane for
// `ADORSYS-GIS/lightbridge-authz` (#478, converse-frontends#409) -- see src/app.tsx's route
// table: `/device`, `/device/invalid`, `/device/confirm`, `/device/success`, and `/error`. It
// still deliberately does not implement:
//   - GET /authorize / the full interactive login form (#425)
//   - session creation / the __Host- cookie for that leg (#441, #443)
// Sign-in is not implemented yet -- device pairing is. This page's own copy says so.
//
// The visual direction for this surface has not been decided. The classes below are
// `packages/ui-web` semantic tokens (console-ui skill "Tokens") rather than the source app's raw
// daisy tokens, which is what makes this page a real proof that ONE stylesheet
// (`@lightbridge/ui-web/styles.css`) compiles utilities for BOTH trees -- picking an actual look
// is story #409's call to make, not this one's.
//
// `min-h-dvh` and `place-items-center` are used by NO other file in `packages/ui-web/src` or
// `apps/console/src` (verified by grep). That is deliberate: their presence in a real
// `apps/authz-ui/dist/assets/*.css` (checked manually as part of this app's build verification --
// `bg-surface`, used in `ui-web` too, couldn't tell apart auto-detection from a stale cache) is
// what proves this app's classes are compiled by `ui-web`'s single Tailwind pass via Vite-root
// automatic content detection -- NOT via any `@source` line in `packages/ui-web/src/theme.css`,
// which carries none for this app (see that file's comment; a probe once here proved the line was
// redundant). `placeholder-page.test.tsx` additionally asserts both classNames render on the
// element itself. Do not "tidy" them into classes another tree already uses.
export function PlaceholderPage() {
  return (
    <main className="grid min-h-dvh place-items-center p-8">
      <div className="max-w-md">
        <NoticePanel>
          <p className="text-ink font-semibold">authz-idp hosted login -- placeholder</p>
          <p className="mt-2">
            This page is served by authz-idp itself, same-origin, exactly as ADR-0021 requires.
            Sign-in is not implemented yet, but device pairing is -- a code from the RFC 8628 device
            flow lands on <code>/device</code>, is confirmed on <code>/device/confirm</code>, and
            finishes on <code>/device/success</code>; a failed attempt lands on <code>/error</code>.
          </p>
        </NoticePanel>
        <ScopeDisclosure />
      </div>
    </main>
  );
}
