// Expo's built-in iOS Maps config-plugin (triggered by `ios.config.googleMapsApiKey`
// in app.json) writes a manual `pod 'react-native-google-maps', path: ...` line into
// the Podfile on every `expo prebuild`. That plugin predates react-native-maps
// consolidating into a single `react-native-maps.podspec` (with Google Maps support
// as an internal subspec/dependency) — the package no longer ships a separate
// `react-native-google-maps.podspec`, so `pod install` fails with "No podspec found
// for react-native-google-maps". Standard autolinking (`use_native_modules!`, already
// in the Podfile) picks up `react-native-maps` correctly on its own, so this generated
// block is obsolete — strip it out after every prebuild.
const fs = require('fs');
const path = require('path');

const podfilePath = path.join(__dirname, '..', 'ios', 'Podfile');
if (!fs.existsSync(podfilePath)) {
  process.exit(0);
}

const content = fs.readFileSync(podfilePath, 'utf8');
const stripped = content.replace(
  /^\s*# @generated begin react-native-maps.*\n(?:.*\n)*?\s*# @generated end react-native-maps\n/m,
  ''
);

if (stripped !== content) {
  fs.writeFileSync(podfilePath, stripped);
  console.log('[fix-ios-podfile] Removed obsolete react-native-google-maps pod entry from Podfile');
}
