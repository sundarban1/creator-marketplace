const { withPodfile } = require('@expo/config-plugins');

// react-native-firebase resolves the Firebase iOS SDK via Swift Package Manager
// by default. firebase-ios-sdk's SPM package only ships dynamic library products,
// so combining it with this project's default static-framework linkage causes
// every RNFB pod to embed its own copy of the same Firebase frameworks — a
// duplicate-symbol link error that only surfaces at `pod install` time with a
// message pointing back here. Opting out of SPM (rather than switching the whole
// project to dynamic linkage, which has broader side effects on other native
// modules) keeps Firebase on the well-supported CocoaPods-only path.
// See: https://rnfirebase.io/#ios
module.exports = function withDisableFirebaseSPM(config) {
  return withPodfile(config, (config) => {
    let contents = config.modResults.contents;
    if (!contents.includes('$RNFirebaseDisableSPM')) {
      contents = "$RNFirebaseDisableSPM = true\n" + contents;
    }
    // Once Firebase is forced onto the CocoaPods-only path above, its Swift
    // pods (FirebaseCoreInternal, FirebaseCrashlytics, FirebaseSessions, ...)
    // depend on GoogleUtilities/GoogleDataTransport/nanopb, none of which
    // define Clang modules — `pod install` fails building them as static
    // libraries without this, per react-native-firebase's own iOS setup docs.
    if (!contents.includes('use_modular_headers!')) {
      contents = "use_modular_headers!\n" + contents;
    }
    config.modResults.contents = contents;
    return config;
  });
};
