// Learn more https://docs.expo.io/guides/customizing-metro
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Native-only packages that break the web bundle. Expo's static web rendering
// evaluates every imported module at build time, and these reach RN's
// NativeModules, throwing "__fbBatchedBridgeConfig is not set" and failing the
// whole export — which is why `expo start --web` never worked in this repo.
//
// The web target is for looking at screens, not for shipping, so each stub is a
// no-op passthrough. Guarded on platform === 'web': iOS and Android resolution
// is completely untouched.
const WEB_STUBS = {
  'react-native-compressor': path.resolve(__dirname, 'src/web-stubs/react-native-compressor.js'),
  'expo-secure-store': path.resolve(__dirname, 'src/web-stubs/expo-secure-store.js'),
  '@react-native-firebase/crashlytics': path.resolve(__dirname, 'src/web-stubs/firebase-crashlytics.js'),
};

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && WEB_STUBS[moduleName]) {
    return { type: 'sourceFile', filePath: WEB_STUBS[moduleName] };
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
