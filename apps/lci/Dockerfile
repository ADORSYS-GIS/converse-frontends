# Runtime-only image for apps/lci.
#
# RUNTIME-ONLY: the artifact is produced on the CI runner by `pnpm turbo run build:web
# --filter=lci` and COPYed in here. There is no Node/pnpm install step and no BuildKit cache mount
# in this file — layer/dependency caching is Turbo's job on the runner, not Docker's (see
# .github/workflows/lci-docker-image.yml).
#
# This app needs a live Node process: server route handlers under src/app/api/** (the OIDC
# login/callback/logout flow, the graph API proxy), and server components that read the session
# cookie and call the control plane. next.config.mjs sets `output: 'standalone'` so `next build`
# traces the actual runtime dependency graph into `.next/standalone/` — that trace, plus the client
# asset output it deliberately excludes (`.next/static/`, copied explicitly below), is this image's
# entire contents.
#
# Build context MUST be the repo root, e.g.:
#   docker build -f apps/lci/Dockerfile -t lci:local .
# (the standalone bundle's node_modules is hoisted to the pnpm workspace root, not scoped under
# apps/lci, so anything narrower than the repo root as context can't see it.)
#
# Fully-qualified (docker.io/library/…) so rootless Buildah resolves it without
# `unqualified-search-registries` configured on the runner.
FROM docker.io/library/node:22.23.2-bookworm-slim

# Update packages to the latest security patches.
RUN apt-get update && \
    apt-get upgrade -y --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# A Next.js `output: 'standalone'` runtime never shells out to npm — `.next/standalone/server.js`
# is started directly with `node`, and this image ships no `package.json` script that needs `npm
# run` at runtime. Removing the base image's bundled npm/npx (and their own dependency tree) means
# one less thing to scan and patch for CVEs that aren't this app's dependencies.
RUN rm -f /usr/local/bin/npm /usr/local/bin/npx && \
    rm -rf /usr/local/lib/node_modules/npm

WORKDIR /app

# `.next/standalone/` preserves the workspace-relative layout (this is a pnpm monorepo): hoisted
# node_modules and the root package.json land at its root, while apps/lci's own server.js, .next/
# (server chunks + manifests) and package.json land under apps/lci/ — exactly the relative paths
# their own `require()` calls expect.
COPY apps/lci/.next/standalone/ ./

# `output: 'standalone'` intentionally does NOT copy the client-asset build output, so it's copied
# explicitly here, per Next's documented standalone deployment recipe. There's no `public/` copy:
# this app has no committed static assets (its brand marks are gitignored and not baked into the
# image — see apps/lci/.gitignore).
COPY apps/lci/.next/static/ ./apps/lci/.next/static/

# Non-root: the base image's own built-in `node` user (uid/gid 1000), not root.
RUN chown -R node:node /app
USER node

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

EXPOSE 3000

# /robots.txt (app/robots.ts) is a static Next metadata route, excluded from proxy.ts's
# session-gate matcher and independent of runtime config — a clean "is the Node server actually
# serving requests" signal. Checked with `node` itself, not wget/curl — neither exists on this
# base image (bookworm-slim ships neither), and Node is already the one thing guaranteed to be
# here.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/robots.txt', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "apps/lci/server.js"]
