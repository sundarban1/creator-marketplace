import { Platform } from 'react-native';

// react-native-background-upload hands `path` straight to net.gotev's
// UploadService on Android, whose scheme handlers only accept a bare
// filesystem path ("/data/...") or "content://" — a "file://" URI (what
// expo-audio, expo-file-system's cacheDirectory etc. all produce) throws
// "Unsupported scheme for file:///...". iOS builds an NSURL from the string
// and needs the file:// form, so only Android is rewritten.
export function toNativeUploadPath(uri: string): string {
  if (Platform.OS !== 'android' || !uri.startsWith('file://')) return uri;
  const path = uri.slice('file://'.length);
  try { return decodeURI(path); } catch { return path; }
}
