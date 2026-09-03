# @lightbridge/authz-rpc

Generated cratestack RPC client for the AuthZ API (accounts / projects / API keys / budget).

The source of truth is `schema/authz.cstack`, copied from the backend repo
(`lightbridge-authz`). Everything under `generated/` is build output — it is gitignored, and
`src/` wraps it with the hand-written runtime and hooks glue.

## Codegen

`generated/` is produced by the official `cratestack generate-typescript` CLI, which ships as
the `@cratestack/cli` npm package (a thin wrapper whose postinstall downloads the matching
Rust binary from GitHub Releases).

It is a `devDependency` of this package, so the repo-root `postinstall` → `codegen:all` chain
regenerates `generated/` on every `pnpm install`. No manually installed tooling is required —
`pnpm install` from the repo root is enough.

To regenerate by hand:

```bash
pnpm --filter @lightbridge/authz-rpc run codegen
```

You need that one-liner in exactly one case: when `generated/` is missing or stale but
`node_modules` is already current. pnpm short-circuits an up-to-date install ("Already up to
date") without running lifecycle scripts, so `pnpm install` is a no-op there and will _not_
rebuild it. A fresh clone, a fresh CI checkout, or any install that actually changes
dependencies does run `postinstall`, and therefore does regenerate it.

## The CLI version pin is a lockstep contract — do not float it

`@cratestack/cli` is pinned to an **exact** version (no `^`), and that version **must match
`lightbridge-authz`'s `cratestack` / `cratestack-pg` pin** (its root `Cargo.toml`
`[workspace.dependencies]`) exactly. Nothing enforces this automatically; it is a manual
convention, and drift is silent and destructive.

That is not hypothetical. It is exactly how
[lightbridge-authz#282](https://github.com/ADORSYS-GIS/lightbridge-authz/issues/282) happened:

- cratestack 0.7.11 changed `Value`'s wire format from externally-tagged to untagged.
- This generator stayed on 0.4.16 and kept hand-tagging `Json` fields to the old shape.
- The untagged-`Value` backend decoded the stale tagged payload **without error** —
  `deserialize_any` treats any JSON object as `Value::Map` — and stored `{"List": [...]}`
  literally.
- That silently defeated the `allowedModels` governance allowlist.

No exception was raised anywhere in the chain. When bumping this pin, bump it in lockstep with
the backend and re-verify the wire format, rather than taking a green CI run as proof.

See also [converse-frontends#149](https://github.com/ADORSYS-GIS/converse-frontends/issues/149).
