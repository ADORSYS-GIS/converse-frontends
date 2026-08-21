const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'apps/*/dist/*', 'storybook-static/*', 'packages/*/storybook-static/*'],
  },
  {
    rules: {
      'react/display-name': 'off',
    },
  },
]);
