FROM --platform=$BUILDPLATFORM node:22-alpine AS build

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

# Copy dependency files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/self-service/package.json apps/self-service/
COPY packages/api-native/package.json packages/api-native/
COPY packages/api-rest/package.json packages/api-rest/
COPY packages/hooks/package.json packages/hooks/
COPY packages/i18n/package.json packages/i18n/
COPY packages/ui/package.json packages/ui/

# Copy OpenAPI specs for codegen
COPY openapi ./openapi
COPY packages/api-rest/openapi-ts.config.ts packages/api-rest/

# Fetch and install dependencies
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm fetch

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --offline --frozen-lockfile

# Copy source files
COPY . .

# Build the web export
RUN pnpm --dir apps/self-service exec expo export --platform web --output-dir dist

# Runtime stage
FROM nginx:1.27-alpine-slim

WORKDIR /usr/share/nginx/html

COPY .docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --chmod=755 .docker/nginx/entrypoint.sh /docker-entrypoint.d/40-runtime-config.sh

COPY --from=build /app/apps/self-service/dist/ /usr/share/nginx/html/
COPY --from=build /app/apps/self-service/example.config.json /usr/share/nginx/html/config.template.json

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
