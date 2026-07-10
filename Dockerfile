# Runtime-only image. The web bundle (apps/self-service/dist) is produced on the
# CI runner by `turbo run build:web` and COPYed in here — there is NO build stage,
# no Node/pnpm, and no BuildKit cache mounts. Layer/dependency caching is handled
# by the runner's Turbo cache, not by the Docker build.
#
# Built and pushed with rootless Buildah on the adorsys-gis-runner (see
# .github/workflows/docker-image.yml).
FROM nginx:1.30.0-alpine3.23-slim

# Update Alpine packages to the latest security patches.
RUN apk update && \
    apk upgrade --no-cache && \
    rm -rf /var/cache/apk/*

WORKDIR /usr/share/nginx/html

COPY .docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --chmod=755 .docker/nginx/entrypoint.sh /docker-entrypoint.d/40-runtime-config.sh

# Prebuilt static web export + the runtime-config template (rendered at startup).
COPY apps/self-service/dist/ /usr/share/nginx/html/
COPY apps/self-service/example.config.json /usr/share/nginx/html/config.template.json

# Set ownership and permissions for the nginx user (101:101).
RUN chown -R 101:101 /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html && \
    chown -R 101:101 /var/cache/nginx && \
    chmod -R 755 /var/cache/nginx && \
    chown -R 101:101 /var/log/nginx && \
    chmod -R 755 /var/log/nginx && \
    chown -R 101:101 /etc/nginx/conf.d && \
    chmod -R 644 /etc/nginx/conf.d/*.conf && \
    touch /var/run/nginx.pid && \
    chown 101:101 /var/run/nginx.pid && \
    chmod 644 /var/run/nginx.pid

USER 101

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
