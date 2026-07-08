import { transformWithEsbuild, type Plugin } from 'vite';
import { defineMain } from '@storybook/react-native-web-vite/node';

// Expo packages whose raw source Vite can't consume as-is under pnpm (see the
// plugin doc below). One list drives both the esbuild re-transpile and
// optimizeDeps.exclude.
const RAW_EXPO_PACKAGES = [
  'expo-modules-core',
  'expo-image',
  'expo-blur',
  'expo-checkbox',
  'expo-font',
  'expo-asset',
];

// CommonJS leaf deps pulled (transitively) by the raw-served expo packages and
// react-native-web. Because their importer isn't pre-bundled, Vite never applies
// CJS→ESM interop and `import x from 'cjs-pkg'` / `import { y } from 'cjs-pkg'`
// fail with "does not provide an export named 'default'/'…'". Pre-bundling them
// (they're devDependencies of this package so they resolve by bare specifier)
// gives them the interop. Add to this list if a new "does not provide an export"
// surfaces for another CJS dep.
const CJS_DEPS_TO_PREBUNDLE = [
  'invariant',
  'fontfaceobserver',
  '@react-native/assets-registry/registry',
  '@react-native/normalize-colors',
  // react-native-web imports these inline-style-prefixer files by exact deep
  // path; each is a separate CJS module needing interop (pre-bundling the
  // package root doesn't cover the subpaths). This is the full set RNW uses.
  'inline-style-prefixer/lib/createPrefixer',
  'inline-style-prefixer/lib/plugins/crossFade',
  'inline-style-prefixer/lib/plugins/imageSet',
  'inline-style-prefixer/lib/plugins/logical',
  'inline-style-prefixer/lib/plugins/position',
  'inline-style-prefixer/lib/plugins/sizing',
  'inline-style-prefixer/lib/plugins/transition',
  // Other CommonJS runtime deps of react-native-web, pulled raw through the
  // (excluded) expo packages' `react-native` imports.
  'postcss-value-parser',
  'styleq',
  'styleq/transform-localize-style',
  'memoize-one',
  'nullthrows',
  'fbjs/lib/invariant',
  'fbjs/lib/warning',
  // The esbuild re-transpile above emits automatic-JSX imports from
  // `react/jsx-runtime` (CJS in React 19) for expo `.js`/JSX source; the named
  // `jsx`/`jsxs` exports need CJS→ESM interop.
  'react/jsx-runtime',
];

/**
 * Re-transpile the raw source of the Expo packages with esbuild before Vite's
 * Rolldown/oxc pipeline sees it.
 *
 * Why this is needed: these packages ship source meant to be transpiled by
 * Metro/Babel, but under this Storybook setup they aren't:
 *   - The framework's babel-transpile filter is
 *     `exclude: /node_modules/(?!react-native|@react-native|expo|@expo|…)/`.
 *     Under pnpm the files live at `/node_modules/.pnpm/<pkg>@…/node_modules/…`,
 *     so the regex matches at the FIRST `/node_modules/` (followed by `.pnpm`,
 *     not in the allow-list) and every `.pnpm/`-nested module is excluded from
 *     transpilation and served raw. `modulesToTranspile` can't fix it — it feeds
 *     the same `.pnpm`-blind regex (adding `.pnpm` doesn't help either: the
 *     babel pass doesn't elide these imports the way esbuild does).
 *   - Served raw, Vite's oxc transform trips over two things: (a) value-syntax
 *     imports of type-only symbols in `expo-modules-core` (e.g.
 *     `import { EventsMap } from './ts-declarations/EventEmitter'`) — the
 *     emitted module then exposes no runtime `EventEmitter`, breaking any
 *     component that transitively pulls it (Button → use-app-fonts → expo-font →
 *     expo-modules-core, expo-image, expo-checkbox…); and (b) JSX shipped in
 *     `.js` build files (e.g. `expo-checkbox/build/ExpoCheckbox.web.js`), which
 *     oxc's import-analysis can't parse.
 *   - Pre-bundling instead (optimizeDeps.include) makes (a) worse: Rolldown
 *     hard-errors `[MISSING_EXPORT] "SharedObject"… add the type modifier`.
 *
 * esbuild's transform drops type-only imports by local usage analysis and
 * handles JSX, so running it here — scoped to these packages — yields modules
 * Vite can consume. Their CommonJS leaf deps still need CJS→ESM interop, which
 * is handled via optimizeDeps.include below. `storybook build` (CI / GitHub
 * Pages) is unaffected; it uses the Rollup pipeline, which already handled all
 * of this.
 *
 * Verified rendering in `storybook dev` after this fix: Badge, Button, Card,
 * Callout, PageHeader, FormField/FormTextField, Select, SectionCard, Pagination,
 * Checkbox, Blur, Lottie, Sheet, and the rest of the RNW-based components.
 * KNOWN RESIDUAL — the `Image` (expo-image) story still errors in dev with
 * `require is not defined`: expo-image pulls `expo/src/async-require/setup`, a
 * Metro-runtime shim that references Metro's `require` global, which doesn't
 * exist under Vite. That's a Metro-vs-Vite incompatibility, not a CJS-interop
 * gap, so it's out of scope here; the static `build-storybook` renders Image
 * fine (Rollup path), which is what deploys to GitHub Pages.
 */
function transpileRawExpoPackages(): Plugin {
  const loaderFor = (path: string) =>
    path.endsWith('.tsx') ? 'tsx' : path.endsWith('.ts') ? 'ts' : 'jsx';
  return {
    name: 'transpile-raw-expo-packages',
    enforce: 'pre',
    async transform(code, id) {
      const path = id.split('?')[0];
      const inRawExpo = RAW_EXPO_PACKAGES.some((pkg) => path.includes(`/${pkg}/`));
      if (!inRawExpo || !/\.(tsx?|jsx?)$/.test(path)) {
        return null;
      }
      const result = await transformWithEsbuild(code, id, {
        loader: loaderFor(path),
        jsx: 'automatic',
      });
      return { code: result.code, map: result.map };
    },
  };
}

export default defineMain({
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
      modulesToTranspile: ['nativewind', 'lottie-react-native', '@lottiefiles/dotlottie-react'],
      pluginReactOptions: {
        jsxImportSource: 'nativewind',
      },
    },
  },
  async viteFinal(viteConfig) {
    viteConfig.optimizeDeps = {
      ...viteConfig.optimizeDeps,
      // Pre-bundle the CJS leaf deps so they get CJS→ESM interop.
      include: [...(viteConfig.optimizeDeps?.include ?? []), ...CJS_DEPS_TO_PREBUNDLE],
      // Keep the expo packages (and lottie) OUT of pre-bundling — their `main`
      // points at raw TS that Rolldown can't bundle. They're served raw and the
      // transpileRawExpoPackages plugin above makes them consumable.
      exclude: [
        ...(viteConfig.optimizeDeps?.exclude ?? []),
        ...RAW_EXPO_PACKAGES,
        'lottie-react-native',
        '@lottiefiles/dotlottie-react',
      ],
    };
    viteConfig.plugins = [transpileRawExpoPackages(), ...(viteConfig.plugins ?? [])];
    return viteConfig;
  },
});
