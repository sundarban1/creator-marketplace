import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { ActionSheetIOS, Alert, Platform } from 'react-native';
import { compressImage } from '@/utilities/uploadImage';
import { showPermissionDeniedAlert } from '@/utilities/permissionAlert';
import type { PickedFile } from '@/utilities/chatAttachments';
import type { CampaignAttachment } from '@/services/guidedCampaign';

// Reference images / PDFs a business attaches to an event (brief.attachments).
// Limits mirror backend campaign.brief.ts + middleware/upload.ts.
export const MAX_ATTACHMENT_IMAGES = 3;
export const MAX_ATTACHMENT_PDFS = 2;
export const MAX_ATTACHMENT_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_ATTACHMENT_PDF_BYTES = 10 * 1024 * 1024;

export function isPdfAttachment(a: Pick<CampaignAttachment, 'kind' | 'mimeType' | 'url' | 'name'>): boolean {
  return a.kind === 'PDF' || a.mimeType === 'application/pdf' || /\.pdf($|\?)/i.test(a.url) || /\.pdf$/i.test(a.name);
}

export type PickResult = { files: PickedFile[]; tooLarge: boolean };

async function sizeOf(uri: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(uri);
  return info.exists ? (info.size ?? 0) : 0;
}

// PNGs are uploaded as-is (keeps transparency, e.g. logos); everything else —
// JPEG, and HEIC from the iOS library which the server doesn't accept — goes
// through the shared compressor, which outputs JPEG.
async function toPickedImage(asset: ImagePicker.ImagePickerAsset, i: number): Promise<PickedFile | null> {
  if (asset.mimeType === 'image/png') {
    const sizeBytes = asset.fileSize ?? await sizeOf(asset.uri);
    if (sizeBytes > MAX_ATTACHMENT_IMAGE_BYTES) return null;
    return { uri: asset.uri, name: asset.fileName ?? `image_${Date.now()}_${i}.png`, mimeType: 'image/png', sizeBytes, fileType: 'image' };
  }
  const { uri, mimeType } = await compressImage(asset, true);
  const sizeBytes = await sizeOf(uri);
  if (sizeBytes > MAX_ATTACHMENT_IMAGE_BYTES) return null;
  const base = (asset.fileName ?? `image_${Date.now()}_${i}`).replace(/\.[^.]+$/, '');
  return { uri, name: `${base}.${mimeType === 'image/jpeg' ? 'jpg' : 'png'}`, mimeType, sizeBytes, fileType: 'image' };
}

async function collect(assets: ImagePicker.ImagePickerAsset[]): Promise<PickResult> {
  const files: PickedFile[] = [];
  let tooLarge = false;
  for (const [i, asset] of assets.entries()) {
    const f = await toPickedImage(asset, i);
    if (f) files.push(f); else tooLarge = true;
  }
  return { files, tooLarge };
}

export async function pickAttachmentImages(remaining: number): Promise<PickResult> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    showPermissionDeniedAlert('Permission required', 'Please allow access to your photo library in Settings.');
    return { files: [], tooLarge: false };
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
    allowsMultipleSelection: remaining > 1,
    selectionLimit: remaining,
  });
  if (result.canceled) return { files: [], tooLarge: false };
  return collect(result.assets.slice(0, remaining));
}

export async function takeAttachmentPhoto(): Promise<PickResult> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    showPermissionDeniedAlert('Permission required', 'Please allow camera access in Settings.');
    return { files: [], tooLarge: false };
  }
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 });
  if (result.canceled) return { files: [], tooLarge: false };
  return collect(result.assets);
}

export async function pickAttachmentPdfs(remaining: number): Promise<PickResult> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    multiple: remaining > 1,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return { files: [], tooLarge: false };
  const files: PickedFile[] = [];
  let tooLarge = false;
  for (const asset of result.assets.slice(0, remaining)) {
    const sizeBytes = asset.size ?? await sizeOf(asset.uri);
    if (sizeBytes > MAX_ATTACHMENT_PDF_BYTES) { tooLarge = true; continue; }
    files.push({ uri: asset.uri, name: asset.name, mimeType: 'application/pdf', sizeBytes, fileType: 'document' });
  }
  return { files, tooLarge };
}

export type AttachmentChoice = 'photo-library' | 'photo-camera' | 'pdf';

export function promptAttachmentSource(
  options: { choice: AttachmentChoice; label: string }[],
  title: string,
  cancelLabel: string,
): Promise<AttachmentChoice | null> {
  return new Promise((resolve) => {
    if (Platform.OS === 'ios') {
      const labels = [...options.map((o) => o.label), cancelLabel];
      ActionSheetIOS.showActionSheetWithOptions(
        { options: labels, cancelButtonIndex: labels.length - 1, title },
        (idx) => resolve(idx < options.length ? options[idx]!.choice : null),
      );
    } else {
      Alert.alert(title, undefined, [
        ...options.map((o) => ({ text: o.label, onPress: () => resolve(o.choice) })),
        { text: cancelLabel, style: 'cancel' as const, onPress: () => resolve(null) },
      ], { cancelable: true, onDismiss: () => resolve(null) });
    }
  });
}

/** Download to cache and hand to the share sheet (Save to Files / Photos, etc.). */
export async function downloadAndShareAttachment(url: string, name: string): Promise<void> {
  const safe = name.replace(/[^a-z0-9._-]+/gi, '_') || 'attachment';
  const dest = `${FileSystem.cacheDirectory}${Date.now()}_${safe}`;
  const { uri } = await FileSystem.downloadAsync(url, dest);
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
  else Alert.alert('Downloaded', `Saved to ${uri}`);
}
