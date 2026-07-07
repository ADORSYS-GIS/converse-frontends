import type { StorybookConfig } from '@storybook/react-native-web-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-a11y'],
  typescript: {
    // react-docgen chokes trying to statically parse react-native's own
    // Flow-typed source through PressableProps/ViewProps type imports.
    // Prop tables aren't needed here, so skip docgen entirely.
    reactDocgen: false,
  },
  framework: {
    name: '@storybook/react-native-web-vite',
    options: {
      modulesToTranspile: [
        'nativewind',
        'react-native-css-interop',
        '@expo/vector-icons',
        'expo-image',
        'expo-blur',
        'expo-checkbox',
        'expo-font',
        'expo-asset',
        'lottie-react-native',
        '@lottiefiles/dotlottie-react',
      ],
      pluginReactOptions: {
        jsxImportSource: 'nativewind',
      },
    },
  },
  async viteFinal(viteConfig) {
    // Expo packages ship raw TS/platform-extension source (e.g.
    // expo-modules-core's `main` points straight at src/index.ts) meant to be
    // consumed through Metro's transform pipeline. Vite's dev-time esbuild
    // dependency scanner chokes on these; excluding them from pre-bundling
    // is the standard mitigation. `storybook build` (the CI/GitHub Pages
    // path) is unaffected — it goes through the working Rollup/Babel plugin
    // pipeline instead. Known remaining limitation: `storybook dev` may
    // still show an error overlay on some expo-native-backed components
    // (see PR description) — use `build-storybook` + a static server to
    // review those locally in the meantime.
    viteConfig.optimizeDeps = {
      ...viteConfig.optimizeDeps,
      exclude: [
        ...(viteConfig.optimizeDeps?.exclude ?? []),
        'expo-modules-core',
        'expo-image',
        'expo-blur',
        'expo-checkbox',
        'expo-font',
        'expo-asset',
        'lottie-react-native',
        '@lottiefiles/dotlottie-react',
      ],
    };
    return viteConfig;
  },
};

export default config;
