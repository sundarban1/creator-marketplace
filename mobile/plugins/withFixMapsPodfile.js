const { withPodfile } = require('@expo/config-plugins');

// Expo's built-in iOS Maps config-plugin (triggered by `ios.config.googleMapsApiKey`
// in app.json) writes a manual `pod 'react-native-google-maps', path: ...` line into
// the Podfile on every `expo prebuild`. That plugin predates react-native-maps
// consolidating into a single `react-native-maps.podspec`, which no longer ships a
// separate `react-native-google-maps.podspec` — `pod install` fails with "No podspec
// found for react-native-google-maps".
//
// Standard autolinking (`use_native_modules!`, already in the Podfile) links
// react-native-maps fine on its own, BUT only its default `Maps` subspec — Google
// Maps support on iOS lives behind a separate `Google` subspec
// (react-native-maps/ios/AirGoogleMaps) that isn't activated unless something
// explicitly asks for it. Without it, `HAVE_GOOGLE_MAPS` stays 0 at compile time
// (see react-native-maps' own script-phase check for $PODS_ROOT/GoogleMaps) and
// `<MapView provider={PROVIDER_GOOGLE}>` silently renders react-native-maps' no-op
// placeholder Google map view on iOS instead of a real map — blank map, no error.
// So this rewrites the broken line to the correct modern equivalent instead of just
// deleting it.
//
// Must run as a `withPodfile` mod (not a `postprebuild` npm script, and not
// `withDangerousMod` either — dangerous mods run *first* in the iOS mod pipeline,
// before the built-in maps plugin has written its block, so there'd be nothing to
// rewrite yet). `withPodfile` mods chain in plugin-array order and the built-in maps
// plugin runs before any user-supplied plugin, so by the time this callback fires
// `config.modResults.contents` already contains the block. A postprebuild npm script
// wouldn't work at all here — EAS Build runs `expo prebuild` directly and never
// invokes package.json's npm lifecycle hooks, so a postprebuild-only fix silently
// never applies in CI even though it works for local `npm run prebuild`/`ios`/`android`.
module.exports = function withFixMapsPodfile(config) {
  return withPodfile(config, (config) => {
    const contents = config.modResults.contents;
    const fixed = contents.replace(
      /pod 'react-native-google-maps', path: (.+)$/m,
      "pod 'react-native-maps/Google', path: $1"
    );

    if (fixed !== contents) {
      config.modResults.contents = fixed;
      console.log('[withFixMapsPodfile] Replaced obsolete react-native-google-maps pod entry with react-native-maps/Google subspec');
    }
    return config;
  });
};
