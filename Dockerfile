FROM node:22-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/self-service/package.json apps/self-service/package.json
COPY packages/api-native/package.json packages/api-native/package.json
COPY packages/api-rest/package.json packages/api-rest/package.json
COPY packages/hooks/package.json packages/hooks/package.json
COPY packages/i18n/package.json packages/i18n/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN pnpm install --frozen-lockfile

FROM deps AS build
WORKDIR /app

COPY . .
RUN pnpm --dir packages/api-rest codegen
RUN pnpm --dir apps/self-service exec expo export --platform web --output-dir dist

FROM nginx:1.27-alpine AS runtime
WORKDIR /usr/share/nginx/html

RUN apk add --no-cache gettext

COPY .docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY .docker/nginx/entrypoint.sh /docker-entrypoint.d/40-runtime-config.sh
RUN chmod +x /docker-entrypoint.d/40-runtime-config.sh

COPY --from=build /app/apps/self-service/dist/ /usr/share/nginx/html/
COPY apps/self-service/example.config.json /usr/share/nginx/html/config.template.json

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
