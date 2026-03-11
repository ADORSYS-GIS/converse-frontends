FROM node:22-alpine AS build

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_ENV=production

RUN corepack enable

WORKDIR /app

# Copy only dependency metadata first
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./

COPY apps/self-service/package.json apps/self-service/package.json
COPY packages/api-native/package.json packages/api-native/package.json
COPY packages/api-rest/package.json packages/api-rest/package.json
COPY packages/hooks/package.json packages/hooks/package.json
COPY packages/i18n/package.json packages/i18n/package.json
COPY packages/ui/package.json packages/ui/package.json

# Fetch dependencies (highly cacheable)
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm fetch

# Install offline using fetched packages
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --offline --frozen-lockfile --ignore-scripts

COPY . .

RUN pnpm --dir packages/api-rest codegen && \
    pnpm --dir apps/self-service exec expo export --platform web --output-dir dist

# Remove unused icon fonts (only Ionicons is used) - run separately for clarity
RUN find apps/self-service/dist -name "*.ttf" ! -iname "*ionicons*" -delete 2>/dev/null || true && \
    find apps/self-service/dist -type d -empty -delete 2>/dev/null || true

# Runtime stage
FROM nginx:1.27-alpine-slim

WORKDIR /usr/share/nginx/html

# nginx config
COPY .docker/nginx/default.conf /etc/nginx/conf.d/default.conf

# runtime config injection
COPY --chmod=755 .docker/nginx/entrypoint.sh /docker-entrypoint.d/40-runtime-config.sh

COPY --from=build /app/apps/self-service/dist/ /usr/share/nginx/html/
COPY --from=build /app/apps/self-service/example.config.json /usr/share/nginx/html/config.template.json

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
