module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    // EAS injects GOOGLE_SERVICES_JSON as a path to the decrypted secret file
    // during cloud builds; app.json's static path is the local-dev fallback.
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? config.android.googleServicesFile,
  },
  ios: {
    ...config.ios,
    // Same pattern as android above: EAS injects GOOGLE_SERVICE_INFO_PLIST as a
    // path to the decrypted secret file during cloud builds; the static path is
    // the local-dev fallback. NOTE: no GoogleService-Info.plist exists in this
    // repo yet — it must be downloaded from the Firebase console and placed at
    // mobile/GoogleService-Info.plist (or set as an EAS secret) before an iOS
    // prebuild/build will succeed; @react-native-firebase/app's config plugin
    // throws a hard error at prebuild time if this path doesn't resolve to a
    // real file.
    googleServicesFile: process.env.GOOGLE_SERVICE_INFO_PLIST ?? './GoogleService-Info.plist',
  },
});
