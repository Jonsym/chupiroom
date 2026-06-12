// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // `web/` is a separate Next.js app with its own ESLint config — keep the
    // Expo lint scoped to the mobile app at the root.
    ignores: ['dist/*', 'web/**'],
  },
]);
