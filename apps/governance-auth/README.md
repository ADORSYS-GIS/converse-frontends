# governance-auth (callback page)

The page a browser lands on after `governance-auth`'s OAuth2 **loopback** redirect — the one that
says whether the terminal got a session, and then gets out of the way.

It used to be a hand-written HTML template inside the Rust binary
(`lightbridge-governance`, `app/governance-auth/src/oauth/callback_page/`). It lives here now for
one reason: it is a Lightbridge screen, and it should look like the rest of Lightbridge. It renders
through the same `packages/ui-web` sections, the same `theme.css` tokens and the same two themes
(`black` / `wireframe`) as `apps/console` and `apps/authz-ui`.

## The one constraint everything else follows from

The Rust side `include_str!`s this page at **compile time** and writes it to a socket bound to
`127.0.0.1`. There is no origin behind it, no CDN, and the machine may be offline. So:

> **The build output is exactly one self-contained `.html` file. No external reference of any
> kind — no `<link>`, no `<script src>`, no webfont URL, no image URL.**

That is not a preference, it is the difference between a page and a broken page. It is also a
privacy property: the URL that reached this page carried an OAuth authorization `code`, and any
external reference would hand a third party a `Referer` containing it. (`<meta name="referrer"
content="no-referrer">` is in `index.html` for the same reason.)

`vite-plugin-singlefile` inlines the JS and the CSS; `build.assetsInlineLimit` inlines everything
the CSS references (the `@fontsource` `.woff2`/`.woff` files become `data:` URIs). Then
`scripts/verify-single-file.mjs` **fails the build** if any of it stopped being true. Do not remove
that step.

## Build it

```bash
pnpm install
pnpm --filter governance-auth build:web
```

`build:web` is `tsc --noEmit` → `vite build` → `verify-single-file`. It is a normal turbo task, so
`pnpm build` at the repo root builds this app too.

Output — **one file, nothing else**:

```
apps/governance-auth/dist/index.html      (~566 KiB)
```

The verifier prints what it checked, which is the evidence to paste into a PR:

```
  emitted: index.html
  ok   dist/ contains exactly one file
  ok   the one file is index.html
  size:    565.9 KiB
  ok   no tag carries a src/href/srcset/data/poster attribute
  ok   no <link> element at all
  ok   no CSS @import
  ok   no protocol-relative URL
  ok   every CSS url() is a data: URI
  ok   every absolute URL is an XML namespace or an error-message diagnostic
  ok   exactly 4 @font-face rules, one per console face
  fonts:   4 faces (IBM Plex Mono 400/500/600, Inter 400), 181.3 KiB inlined
  ok   inlined font data is under 200 KiB
  ok   the status placeholder survives the build exactly once
  ...
```

Local preview (`pnpm --filter governance-auth dev`, port 5174) serves the failure page by default;
`http://localhost:5174/?status=success` shows the success page. That query parameter is
`import.meta.env.DEV`-only and is compiled out of the production bundle — the verifier asserts it.

## The contract with the Rust side

Two things move between the repos: **one file**, and **one string replacement**.

### 1. The file

Copy the built artifact into the Rust tree, replacing the current template:

```bash
cp apps/governance-auth/dist/index.html \
   ../lightbridge-governance/app/governance-auth/src/oauth/callback_page/templates/callback.html
```

`dist/` is gitignored here on purpose — the Rust repo commits the artifact it ships, the same way
it committed the template it is replacing. Nothing in the Rust build reaches into this repo.

### 2. The replacement

The page ships with the outcome unset. `index.html` carries it on `<html>`:

<!-- prettier-ignore -->
```text
<html lang="en" data-theme="black" data-callback-status="__GOVERNANCE_AUTH_CALLBACK_STATUS__">
```

Rust rewrites that one literal — `minijinja` is no longer needed, and neither is autoescaping,
because the only two values are compile-time constants:

```rust
const TEMPLATE: &str = include_str!("templates/callback.html");
const STATUS_PLACEHOLDER: &str = "__GOVERNANCE_AUTH_CALLBACK_STATUS__";

fn document(success: bool) -> String {
    TEMPLATE.replace(STATUS_PLACEHOLDER, if success { "success" } else { "error" })
}
```

`http_response` is unchanged: same status line, same `Content-Type: text/html; charset=utf-8`,
same `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`,
`Connection: close`, and `Content-Length` still measured in **bytes** (`body.len()`).

**The page fails closed.** Only the exact string `success` renders the success page. The
unreplaced placeholder, an empty value, a typo — anything else renders the failure page, which
sends the user to their terminal, which is the source of truth either way
(`src/callback-status.ts`, and the `fails closed on …` cases in `src/callback-status.test.ts`).
That means a broken replacement degrades instead of lying, but it is still a bug: keep a Rust-side
test asserting the placeholder is gone from the rendered output, the way
`the_template_is_rendered_not_emitted_raw` does today.

### What the Rust-side test has to become

`callback_page::tests::makes_no_external_requests` currently probes the rendered page for
`"http://"`, `"https://"`, `"//cdn"`, `"<link"`, `"@import"`, `"src="`. **Three of those now
produce false positives**, and they are not fixable in this app:

| Probe      | Status                                                                                                                                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `<link`    | Still valid. Keep it.                                                                                                                                                                                                    |
| `@import`  | Still valid. Keep it.                                                                                                                                                                                                    |
| `//cdn`    | Still valid. Keep it.                                                                                                                                                                                                    |
| `http://`  | **False positive.** React DOM carries `http://www.w3.org/2000/svg`, `.../1998/Math/MathML`, `.../1999/xlink`, `.../XML/1998/namespace` for `createElementNS`. XML namespace URIs are _names_; nothing fetches them.      |
| `https://` | **False positive.** `react-dom`'s production build appends `https://react.dev/errors/` to its minified error messages. It is text inside a thrown `Error`, never a request.                                              |
| `src=`     | **False positive.** `<style>`/`<script>` carry `format("woff2")` and `src:` inside inlined `@font-face` rules, and minified JS contains attribute-name literals. What matters is `src=` **on a tag**, not the substring. |

The property worth asserting is "nothing here makes the browser fetch anything", and
`scripts/verify-single-file.mjs` already asserts it in that form — tag attributes, `url()` targets,
and an allowlist for the namespace/diagnostic URLs above. Mirror it on the Rust side as:

- no `<link`, no `@import`, no `//cdn` (unchanged);
- no `src=`/`href=` **inside a tag** — e.g. reject on the regex `<[a-z]+[^>]*\ssrc=`;
- every `http(s)://` occurrence is one of the five URLs listed above.

## What the page can render

Five states in total — two outcomes × two phases of the close attempt, plus the fail-closed case,
which is the failure page.

| Marker        | Heading          | Statement                                                      | Announced as  |
| ------------- | ---------------- | -------------------------------------------------------------- | ------------- |
| `success`     | You're signed in | Your terminal has the session. This tab is finished with.      | `role=status` |
| `error`       | Sign-in failed   | Nothing was saved. Your terminal has the reason — check there. | `role=alert`  |
| anything else | (as `error`)     | (as `error`)                                                   | `role=alert`  |

Under either, one hint line that changes exactly once:

| Phase                        | Hint                                                |
| ---------------------------- | --------------------------------------------------- |
| first 1200 ms                | Closing this tab…                                   |
| after the close is attempted | You can close this tab and return to your terminal. |

`window.close()` is best-effort and always has been: browsers honour it only for windows a script
opened, and this tab was reached by a redirect. The page **tries**, then says what is true. It
never claims to have closed.

The tab title carries the outcome (`You're signed in · governance-auth`), set in `src/main.tsx`
before React mounts, because a static `index.html` can only ship one title.

## Design notes

- **Composed, not hand-rolled.** `AuthPanelShell` (the auth-plane layout `apps/authz-ui`'s device
  pages use), `AuthErrorPanel` (the failure statement), `InlineStatus` (the success statement and
  the hint). No new primitive, no fork, no extension — the only visual decision made here is
  stepping the hint down one type role with `META_CLASS`.
- **No status icon, no signal colour on success.** The Rust page drew a green or red circled
  glyph. ADR 0008's status-as-text rule (unchanged by ADR 0012) says a status is words, and that
  is also the accessibility answer: the outcome is the heading, and the statement under it is a
  live region, so nothing about the outcome is carried by colour alone.
- **Theme.** `index.html` ships `data-theme="black"`; `vite.config.ts` inlines
  `CONSOLE_THEME_NO_FLASH_SCRIPT` (`packages/ui-web/src/lib/theme.ts`) into `<head>` so a machine
  in light mode resolves to `wireframe` before first paint. This is the one place the three web
  surfaces differ for a real reason: `apps/console` inlines the same script, `apps/authz-ui`
  cannot (its CSP forbids inline scripts), and this app has no CSP at all because nothing serves
  it — a loopback listener writes bytes to a socket.
- **Fonts are Latin-subset only.** `vite.config.ts` redirects the four `@fontsource` entrypoints
  `packages/ui-web/src/styles.css` imports to their `latin-*.css` twins. Same families, same
  weights, same files — it drops the writing systems this page cannot render, because every byte
  here is compiled into a shipped binary: 22 faces / 656 KiB became 4 faces / 181 KiB. The
  replacement paths must be **absolute** (`require.resolve`); `@tailwindcss/vite` resolves the
  `@import`s in `styles.css` with its own resolver and silently ignores a bare Vite alias.
- **English string literals, no i18n.** `@lightbridge/i18n` has no consumer on the web surface —
  neither `apps/console` nor `apps/authz-ui` import it. Four fixed sentences on a loopback socket
  is not where that changes.

## Tests

```bash
pnpm --filter governance-auth test
```

`src/callback-status.test.ts` pins the fail-closed resolution; `src/callback-page.test.tsx` pins
both outcomes, both ARIA roles, and the close attempt (including the browser that refuses by
throwing). Both were verified by breaking the code and watching them fail for the predicted
reason.
