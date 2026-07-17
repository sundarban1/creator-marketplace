import { Video } from 'react-native-compressor';

// Real on-device compression before upload — reduces upload time/data usage on
// Nepali mobile data. Falls back to the original file rather than blocking the
// send if compression fails (unsupported codec/container on this device) —
// the server still enforces the hard duration/size caps regardless.
export async function compressVideo(uri: string): Promise<string> {
  try {
    return await Video.compress(uri, { compressionMethod: 'auto' });
  } catch {
    return uri;
  }
}
