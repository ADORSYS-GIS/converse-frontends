# Pre-Push Checklist ✅

## Configuration Status

### ✅ Core Files Verified
- [x] `.npmrc` - Simple config with `node-linker=hoisted`
- [x] `metro.config.js` - Symlink support enabled
- [x] `babel.config.js` - Correct jsxImportSource for NativeWind v4
- [x] `Dockerfile` - Proper pnpm setup with caching
- [x] `packages/i18n/src/index.ts` - Re-exports useTranslation

### ✅ Import Hygiene
- [x] No direct imports from `react-i18next` in app code
- [x] No direct imports from `react-i18next` in hooks package
- [x] All imports use workspace packages (`@lightbridge/*`)

### ✅ Dependencies
- [x] No peer dependency conflicts (`pnpm peers check` passes)
- [x] All required Babel plugins installed
- [x] NativeWind v4 properly configured

## What Was Fixed

1. **Metro Configuration**
   - Enabled `unstable_enableSymlinks` for pnpm support
   - Enabled `unstable_enablePackageExports` for modern packages
   - Set `disableHierarchicalLookup: false` for monorepo resolution

2. **Babel Configuration**
   - Changed `jsxImportSource` from `'nativewind'` to `'react-native-css-interop'`
   - This is required for NativeWind v4

3. **Import Architecture**
   - Fixed all imports to use workspace packages
   - `@lightbridge/i18n` now re-exports `useTranslation`
   - Apps and packages import from `@lightbridge/i18n`, not `react-i18next`

4. **Dependency Management**
   - Added missing Babel plugins to devDependencies
   - Fixed Tailwind CSS version conflicts
   - Removed deprecated `@hey-api/client-axios`

## Docker Build Flow

```
1. Copy package.json files + OpenAPI specs
2. pnpm fetch (downloads to cache)
3. pnpm install --offline --frozen-lockfile
   └─> Runs postinstall → codegen
4. Copy source files
5. expo export --platform web
6. Copy dist to nginx image
```

## Expected Build Time

- **First build**: ~2-3 minutes (downloading dependencies)
- **Cached builds**: ~30-60 seconds (using pnpm cache)

## If Build Fails

Check these in order:

1. **"Unable to resolve module X"**
   - Verify Metro config has symlink support enabled
   - Check if X is imported directly instead of through workspace package

2. **"Cannot find module 'babel-preset-expo'"**
   - Ensure it's in devDependencies
   - Check NODE_ENV isn't set to production during install

3. **"react-native-css-interop/jsx-runtime not found"**
   - Verify babel.config.js has `jsxImportSource: 'react-native-css-interop'`

4. **Peer dependency errors**
   - Run `pnpm peers check` locally
   - Fix any conflicts before pushing

## Success Indicators

When the build succeeds, you'll see:

```
Web Bundling complete 100.0% (XXX/XXX modules)
Exporting...
Export complete
```

Then the nginx image will be built and Trivy security scan will run.

### Security Scan

The CI pipeline includes Trivy scanning for vulnerabilities:

```bash
# Trivy scans the built image for HIGH and CRITICAL vulnerabilities
trivy image scan-target
```

**Expected:** No HIGH or CRITICAL vulnerabilities in Alpine packages (OpenSSL, musl, zlib).

We use `nginx:1.30.0-alpine3.23-slim` which has the latest security patches. The Dockerfile includes `apk upgrade` to ensure all packages are updated at build time.

## Documentation

See `DOCKER_BUILD_SETUP.md` for detailed technical explanation.

---

**Status**: ✅ Ready to push

All configurations verified and documented. The Docker build should succeed.
