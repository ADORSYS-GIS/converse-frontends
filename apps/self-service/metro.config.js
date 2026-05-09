const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Required for pnpm workspace: merge workspace root with default watchFolders
const defaultWatchFolders = config.watchFolders || [];
config.watchFolders = [...defaultWatchFolders, workspaceRoot];

// Required for pnpm workspace: resolve from both project and workspace node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Required for some workspace packages that use package.json exports
config.resolver.unstable_enablePackageExports = true;

module.exports = withNativeWind(config, { input: './global.css' });
