// A native `<details>`/`<summary>`: the expand/collapse behaviour, keyboard operation and
// `aria-expanded` wiring the source app reached for `@headlessui/react` to get, with no
// dependency at all.
//
// Headless UI is deliberately NOT carried across. ADR 0010 Decision 2's primitive stack is Base
// UI + daisyUI + cmdk + Floating UI, "four libraries, four non-overlapping jobs -- never solve
// one need with two", and `packages/ui-web` imports Headless UI nowhere. Base UI 1.7 does ship a
// `Collapsible`, but `ui-web` has no adoption of it yet and this is a placeholder that story #409
// restyles; adding a component dependency to an app for one throwaway widget is the wrong trade
// here. When this surface gets a real design pass, the disclosure belongs in `ui-web` on Base UI,
// not in this app.
//
// Token utilities only, no daisyUI component class -- see notice-panel.tsx's doc comment.
export function ScopeDisclosure() {
  return (
    <details className="mt-4">
      <summary className="text-soft hover:text-ink cursor-pointer rounded px-3 py-1 text-sm">
        What is this page?
      </summary>
      <div className="text-subtle pt-2 text-sm">
        This page exists to prove authz-idp serves its own static build, same-origin (ADR-0021). The
        sign-in flow itself -- redirecting to Keycloak, completing the session, returning to the
        requesting client -- is not implemented yet. See, in `ADORSYS-GIS/lightbridge-authz`:
        <ul className="mt-1 list-disc pl-5">
          <li>#424 -- the RP leg to Keycloak</li>
          <li>#425 -- GET /authorize</li>
          <li>#441, #443 -- session creation and the __Host- cookie</li>
        </ul>
      </div>
    </details>
  );
}
