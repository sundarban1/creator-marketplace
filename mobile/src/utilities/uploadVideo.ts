import { Video } from 'react-native-compressor';

// Real on-device compression before upload — reduces upload time/data usage on
// Nepali mobile data. Falls back to the original file rather than blocking the
// send if compression fails (unsupported codec/container on this device) —
// the server still enforces the hard duration/size caps regardless.
// onProgress receives a 0..1 fraction (react-native-compressor reports it as
// such internally — see its iOS exporter multiplying by 100 only for its own
// progressDivider throttling), letting callers drive a real progress bar
// instead of an indeterminate spinner while the video is prepared.
export async function compressVideo(uri: string, onProgress?: (fraction: number) => void): Promise<string> {
  try {
    return await Video.compress(uri, { compressionMethod: 'auto' }, onProgress);
  } catch {
    return uri;
  }
}
