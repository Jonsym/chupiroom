// Learn more: https://docs.expo.dev/guides/customizing-metro/
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Keep the Next.js web companion (/web — its own app + node_modules) out of the
// mobile bundler entirely, so it can't cause duplicate-package collisions or
// extra file watching. The web app is unrelated to the Expo build.
const webDir = path.join(__dirname, 'web');
const escapedWebDir = webDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
config.resolver.blockList = [new RegExp(`^${escapedWebDir}[\\\\/].*`)];

// Zustand's ESM build (chosen by Metro's web "import" condition) uses
// `import.meta.env`, which Metro's web output loads as a classic script —
// causing "Cannot use 'import.meta' outside a module" and breaking hydration.
// Native resolves Zustand's CJS build and is unaffected. On web only, point
// Zustand imports directly at the equivalent CJS files (no import.meta).
const zustandDir = path.join(__dirname, 'node_modules', 'zustand');
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && (moduleName === 'zustand' || moduleName.startsWith('zustand/'))) {
    const sub = moduleName === 'zustand' ? 'index.js' : `${moduleName.slice('zustand/'.length)}.js`;
    return { type: 'sourceFile', filePath: path.join(zustandDir, sub) };
  }
  return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
