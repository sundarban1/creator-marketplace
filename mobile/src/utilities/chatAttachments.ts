import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert, ActionSheetIOS, Platform } from 'react-native';
import { compressImage } from '@/utilities/uploadImage';

export type PickedAttachment = { uri: string; name: string; mimeType: string };

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
const CHAT_VIDEO_MAX_DURATION_SEC = 120; // matches backend's 2-minute cap
const CHAT_VIDEO_MAX_SIZE_BYTES = 200 * 1024 * 1024; // matches backend uploadChatVideo limit

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

export async function pickVideoFromLibrary(): Promise<PickedVideo | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission required', 'Please allow access to your photo library in Settings.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    videoMaxDuration: CHAT_VIDEO_MAX_DURATION_SEC, // iOS enforces this at the picker; Android doesn't, so re-checked below regardless
  });
  if (result.canceled) return null;
  const asset = result.assets[0]!;

  const durationSec = Math.round((asset.duration ?? 0) / 1000);
  if (durationSec > CHAT_VIDEO_MAX_DURATION_SEC) {
    Alert.alert('Video too long', 'Please choose a video under 2 minutes.');
    return null;
  }

  const info = await FileSystem.getInfoAsync(asset.uri);
  const sizeBytes = info.exists ? (info.size ?? 0) : 0;
  if (sizeBytes > CHAT_VIDEO_MAX_SIZE_BYTES) {
    Alert.alert('Video too large', 'Please choose a video under 200 MB.');
    return null;
  }

  return {
    uri: asset.uri,
    name: `video_${Date.now()}.${asset.uri.split('.').pop() ?? 'mp4'}`,
    mimeType: asset.mimeType ?? 'video/mp4',
    durationSec,
    width: asset.width,
    height: asset.height,
    sizeBytes,
  };
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

export function promptAttachmentChoice(): Promise<'gallery' | 'video' | 'document' | null> {
  return new Promise((resolve) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        // Video option hidden from UI for now (upload reliability issue) — code below kept intact.
        { options: ['Photo', /* 'Video', */ 'Document', 'Cancel'], cancelButtonIndex: 2 },
        (idx) => resolve(idx === 0 ? 'gallery' : idx === 1 ? 'document' : null),
      );
    } else {
      Alert.alert('Add Attachment', undefined, [
        { text: 'Photo',    onPress: () => resolve('gallery') },
        // { text: 'Video', onPress: () => resolve('video') }, // hidden from UI for now (upload reliability issue)
        { text: 'Document', onPress: () => resolve('document') },
        { text: 'Cancel',   style: 'cancel', onPress: () => resolve(null) },
      ]);
    }
  });
}
