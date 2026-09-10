# Runtime image for apps/typst-render — the Typst PDF sidecar the console's export pipeline POSTs
# to (ADR ruling on converse-frontends#453: "Typst in a sidecar container", so the console image
# never gains a Typst binary or a browser engine).
#
# RUNTIME-ONLY, exactly like apps/lci/Dockerfile: `dist/` is produced on the CI runner by
# `pnpm turbo run build:web --filter=typst-render` and COPYed in. There is no Node/pnpm install
# step here — layer caching is Turbo's job on the runner, not Docker's (see
# .github/workflows/typst-render-image.yml).
#
# Build context MUST be the repo root, mirroring the sibling app Dockerfiles:
#   pnpm turbo run build:web --filter=typst-render
#   docker build -f apps/typst-render/Dockerfile -t typst-render:local .

# ---------------------------------------------------------------------------------------------
# Stage 1: the pinned official Typst image, used only as a source for its binary.
#
# PINNED, never `latest`: an unpinned tool inside a release path is a real breakage risk, and a
# Typst minor bump can change how a template renders — that has to be a reviewed commit, not
# something a rebuild picks up silently. Tag verified to exist and to be multi-arch (amd64 +
# arm64) with `docker manifest inspect ghcr.io/typst/typst:0.15.1`. Note the tag has NO `v`
# prefix: the `v0.13.1`-style tags stopped at 0.13.1, and `v0.15.1` does not resolve.
FROM ghcr.io/typst/typst:0.15.1 AS typst

# ---------------------------------------------------------------------------------------------
# Stage 2: runtime. Same node:22 bookworm-slim base the console and lci use, so this sidecar is
# patched on the same cadence as its siblings and shares their base layers in the registry.
#
# Fully-qualified (docker.io/library/…) so rootless Buildah resolves it without
# `unqualified-search-registries` configured on the runner.
FROM docker.io/library/node:22.23.2-bookworm-slim

# Update packages to the latest security patches (mirrors apps/lci/Dockerfile).
RUN apt-get update && \
    apt-get upgrade -y --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# This service has ZERO npm dependencies at runtime — the whole point of writing it on `node:http`
# rather than a framework — so there is no `node_modules` in this image and nothing ever runs
# `npm`. Removing the base image's bundled npm/npx drops their dependency tree from the CVE
# surface, same reasoning as apps/lci/Dockerfile.
RUN rm -f /usr/local/bin/npm /usr/local/bin/npx && \
    rm -rf /usr/local/lib/node_modules/npm

# The Typst release binary is a statically linked (static-PIE) executable, so it runs unchanged on
# this glibc base even though the image it comes from is Alpine/musl. That is not an assumption —
# it was probed before this file was written:
#   docker build --platform linux/amd64 -<<'EOF'
#   FROM ghcr.io/typst/typst:0.15.1 AS typst
#   FROM docker.io/library/node:22.23.2-bookworm-slim
#   COPY --from=typst /bin/typst /usr/local/bin/typst
#   RUN typst --version
#   EOF
#   # => typst 0.15.1 (unknown commit)
# If a future Typst release ever ships a dynamically linked musl binary, that `typst --version`
# smoke check below fails the build here rather than at runtime in the cluster.
COPY --from=typst /bin/typst /usr/local/bin/typst
RUN typst --version

WORKDIR /app

# The compiled service: plain ESM JavaScript, no dependencies, no package.json needed at runtime
# (`node dist/index.js` is started directly and every import is either `node:*` or a relative
# `./*.js`). `"type": "module"` is not required because tsconfig.build.json emits ESM and Node
# treats a bare `.js` under CommonJS by default — so a minimal package.json declaring the module
# type IS copied, and it is the only thing from the workspace besides dist/.
COPY apps/typst-render/dist/ ./dist/
COPY apps/typst-render/package.json ./package.json

# Non-root: the base image's own built-in `node` user (uid/gid 1000), not root. Renders write to
# per-request directories under $TMPDIR, which this user owns.
RUN chown -R node:node /app
USER node


# Build stamp (lightbridge-authz#573) — the same ARG -> ENV pair every image in this estate now
# carries, so a running container can name the image it came from. The renderer has no
# `/settings/info` of its own; these are here so that an operator exec'ing into the sidecar, or a
# future `/healthz` extension, can answer "which build is this?" the same way every sibling does.
# Empty defaults mean "not built by the pipeline" rather than a fabricated value.
#
# `IMAGE_TAG` is the tag ALONE (`sha-5fed3ad`); `IMAGE_REF` is the full reference. See
# apps/console/Dockerfile's identical block for why they are two values and not one.
ARG IMAGE_BUILD_SHA=""
ARG IMAGE_TAG=""
ARG IMAGE_REF=""
ARG IMAGE_BUILD_TIME=""
ENV IMAGE_BUILD_SHA=${IMAGE_BUILD_SHA} \
    IMAGE_TAG=${IMAGE_TAG} \
    IMAGE_REF=${IMAGE_REF} \
    IMAGE_BUILD_TIME=${IMAGE_BUILD_TIME}

ENV NODE_ENV=production \
    TYPST_RENDER_PORT=8080 \
    TYPST_RENDER_HOST=0.0.0.0 \
    TYPST_BIN=/usr/local/bin/typst

EXPOSE 8080

# /healthz actually executes `typst --version`, so this probe answers "can this container render",
# not merely "is a socket open" — the failure mode a sidecar built by copying a binary between
# base images is most likely to have. Checked with `node` itself, not wget/curl: bookworm-slim
# ships neither, and Node is already guaranteed to be here.
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:8080/healthz', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/index.js"]
