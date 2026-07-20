const { withPodfile } = require('@expo/config-plugins');

// Expo's built-in iOS Maps config-plugin (triggered by `ios.config.googleMapsApiKey`
// in app.json) writes a manual `pod 'react-native-google-maps', path: ...` line into
// the Podfile on every `expo prebuild`. That plugin predates react-native-maps
// consolidating into a single `react-native-maps.podspec` (with Google Maps support
// as an internal subspec/dependency) — the package no longer ships a separate
// `react-native-google-maps.podspec`, so `pod install` fails with "No podspec found
// for react-native-google-maps". Standard autolinking (`use_native_modules!`, already
// in the Podfile) picks up `react-native-maps` correctly on its own, so this generated
// block is obsolete — strip it out after every prebuild.
//
// Must run as a `withPodfile` mod (not a `postprebuild` npm script, and not
// `withDangerousMod` either — dangerous mods run *first* in the iOS mod pipeline,
// before the built-in maps plugin has written its block, so there'd be nothing to
// strip yet). `withPodfile` mods chain in plugin-array order and the built-in maps
// plugin runs before any user-supplied plugin, so by the time this callback fires
// `config.modResults.contents` already contains the block. A postprobuild npm script
// wouldn't work at all here — EAS Build runs `expo prebuild` directly and never
// invokes package.json's npm lifecycle hooks, so a postprebuild-only fix silently
// never applies in CI even though it works for local `npm run prebuild`/`ios`/`android`.
module.exports = function withFixMapsPodfile(config) {
  return withPodfile(config, (config) => {
    const contents = config.modResults.contents;
    const stripped = contents.replace(
      /^\s*# @generated begin react-native-maps.*\n(?:.*\n)*?\s*# @generated end react-native-maps\n/m,
      ''
    );

    if (stripped !== contents) {
      config.modResults.contents = stripped;
      console.log('[withFixMapsPodfile] Removed obsolete react-native-google-maps pod entry from Podfile');
    }
    return config;
  });
};
