# Runtime-only image for apps/console (ticket #287).
#
# Like the root Dockerfile (still self-service/Expo — see that file), this is RUNTIME-ONLY: the
# artifact is produced on the CI runner by `pnpm turbo run build:web` and COPYed in here. There is
# no Node/pnpm install step and no BuildKit cache mount in this file — layer/dependency caching is
# Turbo's job on the runner, not Docker's (see .github/workflows/docker-image.yml).
#
# The console cannot be served the way self-service was (static files behind nginx): it has server
# route handlers under src/app/api/**, server components that decrypt the session cookie, and a
# byte-forwarding RPC proxy, all of which need a live Node process. `next.config.mjs` sets
# `output: 'standalone'` so `next build` traces the actual runtime dependency graph (not the whole
# workspace) into `.next/standalone/` — that trace, plus the two directories it deliberately
# excludes (`.next/static/` and `public/`, copied explicitly below — see Next's own standalone
# deployment docs), is this image's entire contents.
#
# Build context MUST be the repo root, e.g.:
#   docker build -f apps/console/Dockerfile -t console:local .
# (the standalone bundle's node_modules is hoisted to the pnpm workspace root, not scoped under
# apps/console, so anything narrower than the repo root as context can't see it.)
#
# One more thing MUST run before that command: `node apps/console/scripts/
# stage-cratestack-cbor-for-docker.mjs` — see that script and the CBOR `COPY` below for why. CI
# (.github/workflows/docker-image.yml) runs it as its own step between building the standalone
# bundle and invoking Buildah; this comment is the reminder for a local reproduction.
#
# Fully-qualified (docker.io/library/…) so rootless Buildah resolves it without
# `unqualified-search-registries` configured on the runner (a bare `node:…` short-name fails there
# with "did not resolve to an alias") — same reasoning as the root Dockerfile.
FROM docker.io/library/node:22.23.2-bookworm-slim

# Update Alpine packages to the latest security patches (mirrors the root Dockerfile).
#
# glibc base (2026-08-31, supersedes the libc6-compat/Alpine era): @cratestack/cbor-node ships
# glibc-only prebuilds (no -musl variant, cratestack#850), and Alpine's musl — even with
# libc6-compat's shim — cannot load them. Proven in a real linux/amd64 image build: the usage
# scope guard's codec never initialized, so its slow path fail-closed on every child-account
# query while every local gate stayed green (the standalone tracer/host runs glibc). bookworm-slim
# is the smallest official glibc node image; sharp and every other traced native addon load
# natively on it, ending the compat-shim class entirely.
RUN apt-get update && \
    apt-get upgrade -y --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# The base `node:*` image bundles npm (and npx) as part of the Node distribution —
# `/usr/local/lib/node_modules/npm/` plus its own vendored `node_modules/**`, symlinked from
# `/usr/local/bin/npm` and `/usr/local/bin/npx`. A Next.js `output: 'standalone'` runtime never
# shells out to npm: `.next/standalone/server.js` is started directly with `node`, and this image
# ships no `package.json` script that would need `npm run` at runtime. So npm has no business
# being in the runtime image, and dragging it along means shipping (and re-scanning, and re-
# patching) npm's own dependency tree — registry-fetch (`pacote`), archive handling (`tar`),
# signature verification (`sigstore`) — none of which this app ever calls.
#
# Removed rather than patched: Trivy flags CVEs in that bundled tree (tar, brace-expansion,
# ip-address, pacote, picomatch, sigstore — see the Trivy step in
# .github/workflows/docker-image.yml) that no version bump of this app's own dependencies can
# fix, because they aren't this app's dependencies; they ship inside the base image. Deleting the
# real directory (not just the `/usr/local/bin` symlinks) is what actually removes the flagged
# files — the symlinks alone don't carry any scannable content.
RUN rm -f /usr/local/bin/npm /usr/local/bin/npx && \
    rm -rf /usr/local/lib/node_modules/npm

WORKDIR /app

# `.next/standalone/` preserves the workspace-relative layout (this is a pnpm monorepo): hoisted
# node_modules and the root package.json land at its root, while apps/console's own server.js,
# .next/ (server chunks + manifests) and package.json land under apps/console/ — exactly the
# relative paths their own `require()` calls expect, so the directory structure below matters and
# is not just cosmetic.
COPY apps/console/.next/standalone/ ./

# `output: 'standalone'` intentionally does NOT copy the client-asset build output or the static
# public/ directory — both are copied explicitly, per Next's documented standalone deployment
# recipe.
COPY apps/console/.next/static/ ./apps/console/.next/static/
COPY apps/console/public/ ./apps/console/public/

# The usage scope guard's CBOR codec (2026-08-30 incident; see next.config.mjs's
# `serverExternalPackages` comment) — shipped here, not by Next's standalone tracer. This used to be
# an `outputFileTracingIncludes` block in next.config.mjs, but under Turbopack that block crashes
# the build outright (`TurbopackInternalError: ... Is a directory (os error 21)`, hit on any glob
# match that resolves through a pnpm-store symlink to a directory — the per-platform
# `@cratestack/cbor-node-*` binary package is exactly that). Copying the store dirs straight from
# the build context sidesteps Next's tracer for this package family entirely.
#
# Source is NOT `node_modules/.pnpm/@cratestack+cbor*` directly — a Dockerfile `COPY` whose source
# glob matches multiple directories does not preserve each match's own name, it merges their
# *contents* into one destination and collides the first time two matches both have their own
# `node_modules/` subdirectory ("cannot copy to non-directory: .../node_modules/.pnpm/node_modules/
# @cratestack/cbor-node-darwin-arm64" — true regardless of trailing slashes on source or dest).
# `scripts/stage-cratestack-cbor-for-docker.mjs` (run before this build — see the top-of-file note)
# works around that by staging every needed store dir, under its own original name, as a child of
# ONE directory first; copying that single staged directory here does not hit the same problem. See
# that script's own header for why "needed" is more than just `@cratestack+cbor*` (a transitive
# `@cratestack+ts-types` dependency) and why the store dirs' exact original names have to survive.
# `.docker-stage/` is un-ignored in .dockerignore the same way `.next/standalone/` is above it.
#
# Destination is this image's own top-level `node_modules/.pnpm/` — the standalone COPY above
# already flattened the bundle root onto `/app`, so that's the same `node_modules` every other
# traced package landed in.
COPY apps/console/.docker-stage/cratestack-cbor/ ./node_modules/.pnpm/

# `scripts/link-standalone-cratestack.mjs` re-materializes the top-level `node_modules/@cratestack/*`
# scope symlinks (what Node's resolver actually walks) that the plain COPY above only put the
# *targets* of into `.pnpm/`, glob-driven off whatever `@cratestack+cbor*` store dirs actually
# landed above so a cratestack version bump changes nothing here. Passed `/app/node_modules`
# explicitly: this script's own no-arg default resolves relative to *its own* file location
# (`.next/standalone/node_modules`, the local post-`next build` layout), which is not this image's
# layout. Fails the image build hard (non-zero exit) if it links zero packages, so a regression in
# either this COPY or the upstream store layout is a CI failure, not a silent runtime 500.
COPY apps/console/scripts/link-standalone-cratestack.mjs ./apps/console/scripts/link-standalone-cratestack.mjs
RUN node ./apps/console/scripts/link-standalone-cratestack.mjs /app/node_modules

# Ship the repo's own dev-shaped config.yaml as the image default, so the image is runnable
# out-of-the-box for a smoke test (`docker run` with no other configuration). This is NOT how a
# real deployment configures the app: per config-loader.ts's documented contract, config.yaml is
# the primary config document (YAML-first, not env-var-first) and a deployment needing different
# literals (a real Keycloak issuer, real backend URLs, ...) ships its own config.yaml and points
# CONSOLE_CONFIG at it — see charts/converse-frontend, which mounts one via a ConfigMap.
COPY apps/console/config.yaml ./apps/console/config.yaml

# `next build`'s standalone tracer copies apps/console/.env verbatim into the bundle — it's a
# tracked source file, not a build artifact, and it carries a committed, published, dev-only
# SESSION_SECRET placeholder (see apps/console/.env's own header comment). `@next/env` only fills
# in a variable that ISN'T already set in `process.env`, so a real SESSION_SECRET injected by the
# deployment always wins regardless — but if one is ever *forgotten*, shipping this file would let
# the server boot silently on the known dev placeholder instead of failing fast per
# config-loader.ts's documented "unset secret -> undefined -> fail fast at startup" contract.
# Removed rather than trusted.
RUN rm -f ./apps/console/.env

# Non-root: the base image's own built-in `node` user (uid/gid 1000), not root.
RUN chown -R node:node /app
USER node

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

EXPOSE 3000

# /robots.txt (app/robots.ts) is a static Next metadata route: unauthenticated (middleware.ts's
# matcher excludes it from the session gate) and independent of runtime config (no Keycloak/backend
# reachability required to render it), so it's a clean liveness signal that the Node server itself
# is actually serving requests — as opposed to e.g. /api/session, which legitimately 401s whenever
# there's no session and would make a naive `wget` healthcheck fail on a perfectly healthy server.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/robots.txt || exit 1

CMD ["node", "apps/console/server.js"]
