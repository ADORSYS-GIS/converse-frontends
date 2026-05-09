# Docker Build Configuration - Complete Setup

This document explains the complete configuration for building the Expo app with pnpm in Docker.

## Problem Summary

Metro Bundler (used by Expo) expects a flat dependency structure, but pnpm uses symlinks by default. This caused module resolution failures in Docker builds.

## Solution Overview

We use **Metro's built-in symlink support** (available since React Native 0.72) combined with proper monorepo architecture and explicit dependencies for Babel's jsxImportSource.

## Critical Dependencies

### Explicit Dependencies Required

When using NativeWind v4 with pnpm, you must explicitly add `react-native-css-interop` as a dependency:

```json
{
  "dependencies": {
    "nativewind": "latest",
    "react-native-css-interop": "^0.2.1"  // Required for Babel jsxImportSource
  }
}
```

**Why?** Babel's `jsxImportSource` needs direct access to `react-native-css-interop/jsx-runtime`, but with pnpm's symlink structure, it can't resolve it through NativeWind's dependencies alone.

## Configuration Files

### 1. `.npmrc`
```
node-linker=hoisted
```
- Simple and clean
- Provides better compatibility while still using pnpm's efficiency

### 2. `apps/self-service/metro.config.js`
```javascript
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Enable symlink support for pnpm (React Native 0.72+)
config.resolver.unstable_enableSymlinks = true;
config.resolver.unstable_enablePackageExports = true;

// Ensure workspace packages can resolve their dependencies
config.resolver.disableHierarchicalLookup = false;

module.exports = withNativeWind(config, { input: './global.css' });
```

**Key settings:**
- `unstable_enableSymlinks: true` - Enables Metro to follow pnpm symlinks
- `unstable_enablePackageExports: true` - Supports modern package.json exports
- `disableHierarchicalLookup: false` - Allows proper dependency resolution in monorepo

### 3. `apps/self-service/babel.config.js`
```javascript
module.exports = function (api) {
  api.cache(true);
  let plugins = [];

  plugins.push('react-native-worklets/plugin');

  return {
    presets: [
      [
        'babel-preset-expo',
        {
          jsxImportSource: 'react-native-css-interop', // NativeWind v4 uses this
        },
      ],
      'nativewind/babel',
    ],
    plugins,
  };
};
```

**Critical:** `jsxImportSource` must be `'react-native-css-interop'` for NativeWind v4, not `'nativewind'`.

### 4. `packages/i18n/src/index.ts`
```typescript
export { i18n, initI18n, setLocale } from './i18n-config';
export { I18nProvider } from './i18n-provider';
export { useTranslation } from 'react-i18next'; // Re-export for app usage
```

**Monorepo best practice:** Workspace packages should re-export their dependencies so apps don't import transitive dependencies directly.

### 5. `Dockerfile`
```dockerfile
FROM --platform=$BUILDPLATFORM node:22-alpine AS build

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

# Copy dependency files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/self-service/package.json apps/self-service/
COPY packages/*/package.json packages/

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
# Using Alpine 3.23 which has the latest security patches
FROM nginx:1.30.0-alpine3.23-slim

# Update Alpine packages to latest security patches
RUN apk update && \
    apk upgrade --no-cache && \
    rm -rf /var/cache/apk/*

WORKDIR /usr/share/nginx/html

COPY .docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --chmod=755 .docker/nginx/entrypoint.sh /docker-entrypoint.d/40-runtime-config.sh

COPY --from=build /app/apps/self-service/dist/ /usr/share/nginx/html/
COPY --from=build /app/apps/self-service/example.config.json /usr/share/nginx/html/config.template.json

# Set permissions for Kubernetes compatibility
# Use group permissions so any UID in the root group (GID 0) can access files
# This is the OpenShift/Kubernetes pattern for arbitrary UIDs
RUN chgrp -R 0 /usr/share/nginx/html && \
    chmod -R g=u /usr/share/nginx/html && \
    chgrp -R 0 /var/cache/nginx && \
    chmod -R g=u /var/cache/nginx && \
    chgrp -R 0 /var/log/nginx && \
    chmod -R g=u /var/log/nginx && \
    chgrp -R 0 /etc/nginx/conf.d && \
    chmod -R g=u /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chgrp 0 /var/run/nginx.pid && \
    chmod g=u /var/run/nginx.pid

# Use a non-root user by default (can be overridden by K8s securityContext)
USER 101

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
```

**Key points:**
- Uses pnpm with proper caching
- Copies OpenAPI specs before install (needed for postinstall codegen)
- Multi-stage build for minimal runtime image

## Import Rules

### ✅ Correct
```typescript
// Import from workspace packages
import { useTranslation } from '@lightbridge/i18n';
```

### ❌ Incorrect
```typescript
// Don't import transitive dependencies directly
import { useTranslation } from 'react-i18next';
```

## Verification Checklist

Before pushing:

1. ✅ No peer dependency issues: `pnpm peers check`
2. ✅ All imports use workspace packages (not transitive deps)
3. ✅ Metro config has symlink support enabled
4. ✅ Babel config uses correct jsxImportSource
5. ✅ .npmrc is simple (just node-linker=hoisted)
6. ✅ Dockerfile uses pnpm properly

## Why This Works

1. **Metro's symlink support** (React Native 0.72+) allows it to follow pnpm's symlink structure
2. **node-linker=hoisted** provides better compatibility while keeping pnpm's benefits
3. **Proper monorepo architecture** ensures dependencies are resolved correctly
4. **Correct NativeWind v4 config** uses react-native-css-interop as JSX runtime

## Troubleshooting

If you encounter "Unable to resolve module" errors:

1. Check that Metro config has `unstable_enableSymlinks: true`
2. Verify imports are from workspace packages, not transitive dependencies
3. Ensure babel config has correct `jsxImportSource` for NativeWind v4
4. Run `pnpm install` to ensure all dependencies are properly linked

## References

- [React Native 0.72 - Symlink Support](https://reactnative.dev/blog/2023/06/21/0.72-metro-package-exports-symlinks)
- [Expo Monorepo Guide](https://docs.expo.dev/guides/monorepos/)
- [pnpm Docker Guide](https://pnpm.io/docker)

## Security Scanning

The CI pipeline includes Trivy security scanning for vulnerabilities in the Docker image.

### Base Image Selection

We use `nginx:1.30.0-alpine3.23-slim` for the runtime stage because:
- Alpine 3.23 has the latest security patches for OpenSSL, musl, and zlib
- The `-slim` variant reduces attack surface by including only essential packages
- nginx 1.30.0 is the latest stable version

### Non-Root User

The container runs as a non-root user (UID 101) for security:
- nginx listens on port 8080 (non-privileged port)
- Uses **group permissions pattern** for Kubernetes compatibility
- All files are owned by root:root but group-writable (GID 0)
- Any UID can run the container as long as it's in group 0 (root group)
- Follows security best practices (DS-0002)

**Why group permissions?**
Kubernetes can run containers with arbitrary UIDs via `securityContext.runAsUser`. By setting group ownership to GID 0 (root group) and making files group-readable/writable, any UID assigned by Kubernetes can access the files. This is the standard OpenShift/Kubernetes pattern for supporting arbitrary UIDs.

**Example Kubernetes securityContext:**
```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000  # Any UID works
  runAsGroup: 0    # Must be in root group (GID 0)
  fsGroup: 0       # For volume mounts
```

### Handling Security Vulnerabilities

If Trivy reports vulnerabilities:

1. **Alpine package vulnerabilities**: Update to a newer Alpine version (e.g., 3.23 → 3.24)
2. **nginx vulnerabilities**: Update to the latest nginx version
3. **Application dependencies**: Use pnpm overrides in root `package.json`:

```json
{
  "pnpm": {
    "overrides": {
      "vulnerable-package": "^fixed-version"
    }
  }
}
```

4. **Run `pnpm install` to apply overrides** and test thoroughly

The `apk upgrade` command in the Dockerfile ensures all Alpine packages are updated to their latest patched versions at build time.

### Accepted Risks

If a vulnerability is a false positive or accepted risk, document it in `.trivyignore` with a comment explaining why.

