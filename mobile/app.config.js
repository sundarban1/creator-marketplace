module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    // EAS injects GOOGLE_SERVICES_JSON as a path to the decrypted secret file
    // during cloud builds; app.json's static path is the local-dev fallback.
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? config.android.googleServicesFile,
  },
});
