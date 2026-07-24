module.exports = (api) => {
    api.cache(true);
  return {
    presets: [
        [
            'babel-preset-expo', {
        jsxRuntime: 'automatic',

      }],

    ],
    plugins: [
      [
          'module:react-native-dotenv',
          {
              moduleName: '@env',
              path: '.env',
              allowUndefined: true,
              verbose: false,
              envName: 'APP_ENV',
              safe: false,
          },
      ],
        [
        'module-resolver',
        {
          root: ['./'],
          alias: {
              '@rarimo/rarime-rn-sdk': '../src/index',
            '@iden3/js-crypto': '@iden3/js-crypto/dist/browser/esm/index.js',
          },
          extensions: [
            '.ios.ts',
            '.android.ts',
            '.ts',
            '.ios.tsx',
            '.android.tsx',
            '.tsx',
            '.jsx',
            '.js',
            '.json',
          ],
        },
      ],

    ],
  };
};
