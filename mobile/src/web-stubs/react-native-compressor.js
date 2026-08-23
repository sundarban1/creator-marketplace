// Web-only stub for react-native-compressor, which is native-only: importing it
// under Expo's static web rendering evaluates RN's NativeModules and throws
// "__fbBatchedBridgeConfig is not set", which failed the entire web bundle.
//
// Wired in metro.config.js for platform === 'web' ONLY — native builds resolve
// the real package untouched. Compression is a pre-upload optimisation, so the
// stub passes the source URI straight through: the web target exists here for
// UI verification, not for production uploads.
const passthrough = async (uri) => uri;

export const Video = { compress: passthrough, activateBackgroundTask: async () => {}, deactivateBackgroundTask: async () => {} };
export const Image = { compress: passthrough };
export const Audio = { compress: passthrough };
export const getVideoMetaData = async () => ({});
export const getRealPath = async (uri) => uri;
export default { Video, Image, Audio, getVideoMetaData, getRealPath };
