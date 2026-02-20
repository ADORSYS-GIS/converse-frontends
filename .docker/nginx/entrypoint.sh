#!/bin/sh
set -eu

template="/usr/share/nginx/html/config.template.json"
output="/usr/share/nginx/html/config.json"

if [ -f "$template" ]; then
  envsubst '${EXPO_PUBLIC_BACKEND_URL} ${EXPO_PUBLIC_KEYCLOAK_ISSUER} ${EXPO_PUBLIC_KEYCLOAK_CLIENT_ID} ${EXPO_PUBLIC_KEYCLOAK_SCHEME}' < "$template" > "$output"
fi
