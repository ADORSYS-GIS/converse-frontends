import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-a11y'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  typescript: {
    // Plain DOM components with hand-written prop types — none of packages/ui's
    // React Native docgen fights, but skip it anyway: this package has no need
    // for auto-generated prop tables and it's one less thing that can choke on
    // a CVA variant type.
    reactDocgen: false,
  },
};

export default config;
