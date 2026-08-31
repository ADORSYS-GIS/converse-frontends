import { NoticePanel } from '../components/notice-panel';
import { ScopeDisclosure } from '../components/scope-disclosure';

// PLACEHOLDER PAGE -- this app scaffolds the static build + serving infrastructure, the
// styling/PWA/router plumbing, and this page's shell only. It deliberately does not implement, in
// `ADORSYS-GIS/lightbridge-authz`:
//   - the RP leg to Keycloak (#424)
//   - GET /authorize (#425)
//   - session creation / the __Host- cookie (#441, #443)
// Nothing on this page calls any of those endpoints yet. Rendered for every route this SPA owns
// today (there is exactly one) -- see src/app.tsx's router setup.
//
// The visual direction for this surface has not been decided. The classes below are
// `packages/ui-web` semantic tokens (console-ui skill "Tokens") rather than the source app's raw
// daisy tokens, which is what makes this page a real proof that ONE stylesheet
// (`@lightbridge/ui-web/styles.css`) compiles utilities for BOTH trees -- picking an actual look
// is story #409's call to make, not this one's.
//
// `min-h-dvh` and `place-items-center` are used by NO other file in `packages/ui-web/src` or
// `apps/console/src` (verified by grep). That is deliberate: it makes the `@source
// '../../../apps/authz-ui/src'` line in `packages/ui-web/src/theme.css` falsifiable -- remove it
// and these two utilities vanish from the built CSS, where `bg-surface` (used in `ui-web` too)
// would not. Do not "tidy" them into classes another tree already uses.
export function PlaceholderPage() {
  return (
    <main className="grid min-h-dvh place-items-center p-8">
      <div className="max-w-md">
        <NoticePanel>
          <p className="text-ink font-semibold">authz-idp hosted login -- placeholder</p>
          <p className="mt-2">
            This page is served by authz-idp itself, same-origin, exactly as ADR-0021 requires.
            Sign-in is not implemented yet.
          </p>
        </NoticePanel>
        <ScopeDisclosure />
      </div>
    </main>
  );
}
