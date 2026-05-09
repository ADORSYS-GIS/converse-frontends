# Expo SDK 55 Upgrade Plan

## Current State
- **Current SDK:** 54.0.33
- **Target SDK:** 55.0.0 (latest stable)
- **React Native:** 0.83.1 (already compatible with SDK 55)
- **React:** 19.2.4 (already compatible with SDK 55)

## Key Changes in SDK 55

### Major Features
- ✅ React Native 0.83.2 (we're on 0.83.1, minor bump)
- ✅ React 19.2 support (we're already on 19.2.4)
- ⚠️ **Dropped Legacy Architecture support** (we're using New Architecture)
- 🆕 Hermes v1 available for opt-in
- 🆕 Expo UI (Jetpack Compose + SwiftUI)
- 🆕 New package versioning scheme

### Breaking Changes
- **Legacy Architecture removed** - Only New Architecture supported
- **Minimum versions:**
  - Android 7+ (API 24+)
  - iOS 15.1+
  - Xcode 16.1+
  - Android API level 36

## Upgrade Steps

### 1. Upgrade Expo SDK

```bash
# Upgrade to SDK 55
pnpm add expo@^55.0.0 -w

# Or in apps/self-service
cd apps/self-service
pnpm add expo@^55.0.0
```

### 2. Upgrade All Expo Dependencies

```bash
# Use expo install to upgrade all expo packages
cd apps/self-service
npx expo install --fix

# This will upgrade:
# - expo-asset
# - expo-auth-session
# - expo-blur
# - expo-checkbox
# - expo-crypto
# - expo-font
# - expo-image
# - expo-linking
# - expo-localization
# - expo-router
# - expo-secure-store
# - expo-splash-screen
# - expo-status-bar
# - expo-web-browser
# - babel-preset-expo
```

### 3. Upgrade React Native (if needed)

SDK 55 uses React Native 0.83.2 (we're on 0.83.1):

```bash
cd apps/self-service
pnpm add react-native@0.83.2
```

### 4. Run Expo Doctor

```bash
cd apps/self-service
npx expo-doctor
```

This will check for:
- Incompatible dependencies
- Deprecated packages
- Configuration issues

### 5. Update Native Projects (if using prebuild)

If you have `android/` and `ios/` directories:

```bash
# Delete old native projects
rm -rf android ios

# Regenerate with new SDK
npx expo prebuild
```

### 6. Update Babel Config (if needed)

SDK 55 may have updated babel-preset-expo. Check if any changes are needed in `babel.config.js`.

### 7. Test Thoroughly

```bash
# Test web
pnpm web

# Test native (if applicable)
pnpm android
pnpm ios
```

## Expected Package Updates

Based on SDK 55, these packages will be updated:

| Package | Current | Expected SDK 55 |
|---------|---------|-----------------|
| expo | ~54.0.33 | ~55.0.0 |
| expo-asset | ~12.0.12 | ~13.0.0 |
| expo-auth-session | ~7.0.10 | ~8.0.0 |
| expo-blur | ~15.0.8 | ~16.0.0 |
| expo-checkbox | ~5.0.8 | ~6.0.0 |
| expo-crypto | ~15.0.8 | ~16.0.0 |
| expo-font | ~14.0.11 | ~15.0.0 |
| expo-image | ~3.0.11 | ~4.0.0 |
| expo-linking | ~8.0.11 | ~9.0.0 |
| expo-localization | ~17.0.8 | ~18.0.0 |
| expo-router | ~6.0.23 | ~7.0.0 |
| expo-secure-store | ~15.0.8 | ~16.0.0 |
| expo-splash-screen | ~31.0.13 | ~32.0.0 |
| expo-status-bar | ~3.0.9 | ~4.0.0 |
| expo-web-browser | ~15.0.10 | ~16.0.0 |
| babel-preset-expo | ~12.0.12 | ~13.0.0 |
| react-native | 0.83.1 | 0.83.2 |

## Potential Issues & Solutions

### 1. Deprecated Babel Plugins

**Issue:** SDK 55 may deprecate some Babel plugins.

**Solution:** The `npx expo install --fix` command will handle this automatically.

### 2. NativeWind Compatibility

**Issue:** NativeWind v4 may need updates for SDK 55.

**Solution:** Check NativeWind docs and update if needed:
```bash
pnpm add nativewind@latest
```

### 3. Expo Router Changes

**Issue:** Expo Router 7.0 may have breaking changes.

**Solution:** Review [Expo Router changelog](https://docs.expo.dev/router/introduction/) and update routes if needed.

### 4. New Architecture

**Issue:** SDK 55 only supports New Architecture.

**Solution:** We're already using New Architecture, so no changes needed. ✅

## Verification Checklist

After upgrade:

- [ ] `npx expo-doctor` passes with no errors
- [ ] `pnpm install` completes successfully
- [ ] `pnpm dev` starts without errors
- [ ] Web build works: `pnpm web`
- [ ] Docker build succeeds
- [ ] All screens render correctly
- [ ] Authentication works (Keycloak)
- [ ] API calls work
- [ ] No console errors or warnings

## Rollback Plan

If upgrade fails:

```bash
# Revert package.json changes
git checkout apps/self-service/package.json

# Reinstall old dependencies
pnpm install

# Delete lockfile and reinstall if needed
rm pnpm-lock.yaml
pnpm install
```

## Benefits of Upgrading

1. **Security:** Latest security patches and bug fixes
2. **Performance:** Hermes v1 optimizations
3. **Features:** New Expo UI components (Jetpack Compose + SwiftUI)
4. **Deprecations:** Remove deprecated dependencies
5. **Support:** Better EAS support and longer compatibility window
6. **Modern:** Stay current with React Native ecosystem

## Timeline

1. **Backup:** Commit current state
2. **Upgrade:** Run upgrade commands (~10 minutes)
3. **Test:** Thorough testing (~30 minutes)
4. **Fix:** Address any issues (~variable)
5. **Deploy:** Build and deploy (~20 minutes)

**Total estimated time:** 1-2 hours

## Commands Summary

```bash
# 1. Upgrade Expo SDK
cd apps/self-service
pnpm add expo@^55.0.0

# 2. Upgrade all Expo packages
npx expo install --fix

# 3. Upgrade React Native (if needed)
pnpm add react-native@0.83.2

# 4. Run doctor
npx expo-doctor

# 5. Update workspace packages
cd ../..
pnpm install

# 6. Test
cd apps/self-service
pnpm dev

# 7. Build Docker
cd ../..
docker build -t self-service:sdk55 .
```

## References

- [Expo SDK 55 Announcement](https://expo.dev/sdk/55)
- [Upgrading Expo SDK Walkthrough](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough)
- [Expo Changelog](https://expo.dev/changelog)
- [React Native 0.83 Changelog](https://reactnative.dev/blog)

---

**Ready to upgrade?** Follow the steps above and test thoroughly!
