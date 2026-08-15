const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const fs = require('fs');
const path = require('path');

const config = getDefaultConfig(__dirname);

// idb-keyval ships only ESM + CJS with a package.json `exports` map that Metro
// doesn't resolve correctly on web, causing a runtime "failed to fetch
// dynamically imported module" error. Point Metro directly at the ESM build.
config.resolver = config.resolver ?? {};
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'idb-keyval') {
    return {
      filePath: path.resolve(
        __dirname,
        '../../node_modules/.pnpm/idb-keyval@6.3.0/node_modules/idb-keyval/dist/index.js'
      ),
      type: 'sourceFile',
    };
  }
  // cratestack-cli (packages/authz-rpc's codegen, see
  // packages/authz-rpc/generated/) emits ESM-style relative imports with an
  // explicit `.js` extension (e.g. `from "./runtime.js"`), following the
  // TypeScript convention where a `.js` specifier resolves to the sibling
  // `.ts` source. Metro doesn't apply that convention and looks for a
  // literal `runtime.js` file, which doesn't exist, so resolution fails.
  // Rewrite such an import to its `.ts`/`.tsx` sibling, but only when that
  // sibling actually exists on disk and no real `.js` file sits at the
  // literal path — so bare package specifiers and genuine `.js` files are
  // left completely untouched.
  if ((moduleName.startsWith('./') || moduleName.startsWith('../')) && moduleName.endsWith('.js')) {
    const originDir = path.dirname(context.originModulePath);
    const literalJsPath = path.resolve(originDir, moduleName);
    if (!fs.existsSync(literalJsPath)) {
      const specifierWithoutExt = moduleName.slice(0, -'.js'.length);
      const sourceExt = ['.ts', '.tsx'].find((ext) =>
        fs.existsSync(path.resolve(originDir, `${specifierWithoutExt}${ext}`))
      );
      if (sourceExt) {
        const resolve = originalResolveRequest ?? context.resolveRequest;
        return resolve(context, `${specifierWithoutExt}${sourceExt}`, platform);
      }
    }
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
