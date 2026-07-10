const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
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
        '../../node_modules/.pnpm/idb-keyval@6.2.2/node_modules/idb-keyval/dist/index.js'
      ),
      type: 'sourceFile',
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
