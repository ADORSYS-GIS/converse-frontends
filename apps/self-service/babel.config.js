module.exports = function (api) {
  api.cache(true);
  let plugins = [];

  plugins.push('react-native-worklets/plugin');

  return {
    presets: [
      [
        'babel-preset-expo',
        {
          jsxImportSource: 'react-native-css-interop',
        },
      ],
      'nativewind/babel',
    ],
    plugins,
  };
};
