import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert, ActionSheetIOS, Platform } from 'react-native';
import { compressImage } from '@/utilities/uploadImage';

export type PickedAttachment = { uri: string; name: string; mimeType: string };

export type PickedFile = {
  uri: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  fileType: 'image' | 'document';
};

export type PickedVideo = {
  uri: string;
  name: string;
  mimeType: string;
  durationSec: number;
  width: number;
  height: number;
  sizeBytes: number;
};

const CHAT_IMAGE_MAX_SIZE_BYTES = 20 * 1024 * 1024; // matches backend uploadChatFile limit
const CHAT_VIDEO_MAX_SIZE_BYTES = 500 * 1024 * 1024; // matches backend's 500MB cap
const DELIVERABLE_FILE_MAX_SIZE_BYTES = 5 * 1024 * 1024; // matches backend's uploadDeliverableFile 5MB cap
const DELIVERABLE_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// MP4 (H.264/AAC) is preferred; MOV is accepted and delivered back as MP4 by
// the backend (see videoPlaybackUrl in backend/src/utils/cloudinary.ts).
// Legacy/poorly-supported formats (AVI, MKV, FLV, WMV, 3GP, ...) are rejected
// here before ever reaching the network — the backend re-checks this too in
// case the picker is bypassed.
const CHAT_VIDEO_ALLOWED_MIME_TYPES = ['video/mp4', 'video/quicktime'];

async function toPickedImage(asset: ImagePicker.ImagePickerAsset): Promise<PickedAttachment> {
  const { uri, mimeType } = await compressImage(asset, false);
  const ext = mimeType === 'image/jpeg' ? 'jpg' : (uri.split('.').pop() ?? 'jpg');
  return { uri, name: `photo_${Date.now()}.${ext}`, mimeType };
}

export async function pickImageFromLibrary(): Promise<PickedAttachment | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission required', 'Please allow access to your photo library in Settings.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
  if (result.canceled) return null;
  return toPickedImage(result.assets[0]!);
}

export async function pickImageFromCamera(): Promise<PickedAttachment | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission required', 'Please allow camera access in Settings.');
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 });
  if (result.canceled) return null;
  return toPickedImage(result.assets[0]!);
}

// Shared by both pickers below (chat and deliverables) — format/size/
// readability checks, so "record a video" and "choose from gallery" enforce
// identical rules. No duration cap for either — only file size is limited.
async function validateAndBuildPickedVideo(asset: ImagePicker.ImagePickerAsset): Promise<PickedVideo | null> {
  const mimeType = asset.mimeType ?? 'video/mp4';
  if (!CHAT_VIDEO_ALLOWED_MIME_TYPES.includes(mimeType)) {
    Alert.alert('Unsupported format', 'Please use an MP4 or MOV video.');
    return null;
  }

  const durationSec = Math.round((asset.duration ?? 0) / 1000);

  // Also confirms the file actually exists and is readable before we try to upload it.
  const info = await FileSystem.getInfoAsync(asset.uri);
  if (!info.exists) {
    Alert.alert('Video unavailable', 'This video could not be read. Please try again.');
    return null;
  }
  const sizeBytes = info.size ?? 0;
  if (sizeBytes > CHAT_VIDEO_MAX_SIZE_BYTES) {
    Alert.alert('Video too large', 'Please choose a video under 500 MB.');
    return null;
  }

  return {
    uri: asset.uri,
    name: `video_${Date.now()}.${mimeType === 'video/quicktime' ? 'mov' : 'mp4'}`,
    mimeType,
    durationSec,
    width: asset.width,
    height: asset.height,
    sizeBytes,
  };
}

export async function pickVideoFromLibrary(): Promise<PickedVideo | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission required', 'Please allow access to your photo library in Settings.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'] });
  if (result.canceled) return null;
  return validateAndBuildPickedVideo(result.assets[0]!);
}

export async function pickVideoFromCamera(): Promise<PickedVideo | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission required', 'Please allow camera access in Settings.');
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['videos'] });
  if (result.canceled) return null;
  return validateAndBuildPickedVideo(result.assets[0]!);
}

// ── Deliverable videos ───────────────────────────────────────────────────────
// Same format/size validation as chat (see validateAndBuildPickedVideo above),
// plus multi-select up to however many of the 3 slots remain.

export async function pickDeliverableVideosFromLibrary(remainingSlots: number): Promise<PickedVideo[]> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission required', 'Please allow access to your photo library in Settings.');
    return [];
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    allowsMultipleSelection: remainingSlots > 1,
    selectionLimit: remainingSlots,
  });
  if (result.canceled) return [];

  const picked: PickedVideo[] = [];
  for (const asset of result.assets) {
    const video = await validateAndBuildPickedVideo(asset);
    if (video) picked.push(video);
  }
  return picked;
}

export async function pickDeliverableVideoFromCamera(): Promise<PickedVideo | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission required', 'Please allow camera access in Settings.');
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['videos'] });
  if (result.canceled) return null;
  return validateAndBuildPickedVideo(result.assets[0]!);
}

// ── Deliverable images/documents ────────────────────────────────────────────
// Images are run through the same compressImage() used for chat/profile photos
// (targets ~100-300KB), then double-checked against the 5MB cap as a safety
// net in case compression fails and falls back to the uncompressed original.

async function toPickedDeliverableImage(asset: ImagePicker.ImagePickerAsset): Promise<PickedFile | null> {
  const { uri, mimeType } = await compressImage(asset, false);
  const info = await FileSystem.getInfoAsync(uri);
  const sizeBytes = info.exists ? (info.size ?? 0) : 0;
  if (sizeBytes > DELIVERABLE_FILE_MAX_SIZE_BYTES) {
    Alert.alert('Image too large', 'Please choose an image under 5 MB.');
    return null;
  }
  const ext = mimeType === 'image/jpeg' ? 'jpg' : (uri.split('.').pop() ?? 'jpg');
  return { uri, name: `image_${Date.now()}.${ext}`, mimeType, sizeBytes, fileType: 'image' };
}

export async function pickDeliverableImagesFromLibrary(remainingSlots: number): Promise<PickedFile[]> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission required', 'Please allow access to your photo library in Settings.');
    return [];
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.85,
    allowsMultipleSelection: remainingSlots > 1,
    selectionLimit: remainingSlots,
  });
  if (result.canceled) return [];

  const picked: PickedFile[] = [];
  for (const asset of result.assets) {
    const image = await toPickedDeliverableImage(asset);
    if (image) picked.push(image);
  }
  return picked;
}

export async function pickDeliverableImageFromCamera(): Promise<PickedFile | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission required', 'Please allow camera access in Settings.');
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 });
  if (result.canceled) return null;
  return toPickedDeliverableImage(result.assets[0]!);
}

// PDF/DOCX only — narrower than pickDocumentAttachment's chat allowlist, and a
// 5MB cap instead of 20MB (matches backend's uploadDeliverableFile).
export async function pickDeliverableDocument(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: DELIVERABLE_DOCUMENT_MIME_TYPES,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  const asset = result.assets[0]!;
  const sizeBytes = asset.size ?? 0;
  if (sizeBytes > DELIVERABLE_FILE_MAX_SIZE_BYTES) {
    Alert.alert('File too large', 'Please choose a file under 5 MB.');
    return null;
  }
  return { uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? 'application/octet-stream', sizeBytes, fileType: 'document' };
}

export type DeliverableUploadChoice = 'video-camera' | 'video-library' | 'photo-camera' | 'photo-library' | 'document';

// Single combined chooser backing the one "+" tile in the Upload Deliverables
// sheet — replaces what used to be two separate video-only/file-only action
// sheets, since videos and images/files now share one grid and one add button.
export function promptDeliverableUploadChoice(): Promise<DeliverableUploadChoice | null> {
  return new Promise((resolve) => {
    const labels: [DeliverableUploadChoice, string][] = [
      ['video-camera',  'Record Video'],
      ['video-library', 'Choose Video'],
      ['photo-camera',  'Take Photo'],
      ['photo-library', 'Choose Photos'],
      ['document',      'Choose Document (PDF/DOCX)'],
    ];
    if (Platform.OS === 'ios') {
      const options = [...labels.map(([, label]) => label), 'Cancel'];
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: options.length - 1 },
        (idx) => resolve(idx < labels.length ? labels[idx]![0] : null),
      );
    } else {
      Alert.alert('Add to Deliverables', undefined, [
        ...labels.map(([choice, label]) => ({ text: label, onPress: () => resolve(choice) })),
        { text: 'Cancel', style: 'cancel' as const, onPress: () => resolve(null) },
      ]);
    }
  });
}

export async function pickDocumentAttachment(): Promise<PickedAttachment | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
           'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
           'text/plain', 'application/zip', 'image/jpeg', 'image/png', 'image/webp'],
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  const asset = result.assets[0]!;
  if (asset.size != null && asset.size > CHAT_IMAGE_MAX_SIZE_BYTES) {
    Alert.alert('File too large', 'Please choose a file under 20 MB.');
    return null;
  }
  return { uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? 'application/octet-stream' };
}

// allowVideo defaults to true; pass false to hide "Record Video"/"Choose Video"
// (creator<->creator conversations don't permit video — only creator<->business does).
export function promptAttachmentChoice(allowVideo = true): Promise<'gallery' | 'video-camera' | 'video-library' | 'document' | null> {
  return new Promise((resolve) => {
    if (Platform.OS === 'ios') {
      const options = allowVideo
        ? ['Photo', 'Record Video', 'Choose Video', 'Document', 'Cancel']
        : ['Photo', 'Document', 'Cancel'];
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: options.length - 1 },
        (idx) => {
          if (allowVideo) {
            resolve(idx === 0 ? 'gallery' : idx === 1 ? 'video-camera' : idx === 2 ? 'video-library' : idx === 3 ? 'document' : null);
          } else {
            resolve(idx === 0 ? 'gallery' : idx === 1 ? 'document' : null);
          }
        },
      );
    } else {
      const buttons = allowVideo
        ? [
            { text: 'Photo',        onPress: () => resolve('gallery' as const) },
            { text: 'Record Video', onPress: () => resolve('video-camera' as const) },
            { text: 'Choose Video', onPress: () => resolve('video-library' as const) },
            { text: 'Document',     onPress: () => resolve('document' as const) },
            { text: 'Cancel',       style: 'cancel' as const, onPress: () => resolve(null) },
          ]
        : [
            { text: 'Photo',    onPress: () => resolve('gallery' as const) },
            { text: 'Document', onPress: () => resolve('document' as const) },
            { text: 'Cancel',   style: 'cancel' as const, onPress: () => resolve(null) },
          ];
      Alert.alert('Add Attachment', undefined, buttons);
    }
  });
}
