import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Alert, ActionSheetIOS, Platform } from 'react-native';
import { compressImage } from '@/utilities/uploadImage';

export type PickedAttachment = { uri: string; name: string; mimeType: string };

const CHAT_IMAGE_MAX_SIZE_BYTES = 20 * 1024 * 1024; // matches backend uploadChatFile limit

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

export function promptAttachmentChoice(): Promise<'gallery' | 'document' | null> {
  return new Promise((resolve) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Photo', 'Document', 'Cancel'], cancelButtonIndex: 2 },
        (idx) => resolve(idx === 0 ? 'gallery' : idx === 1 ? 'document' : null),
      );
    } else {
      Alert.alert('Add Attachment', undefined, [
        { text: 'Photo',    onPress: () => resolve('gallery') },
        { text: 'Document', onPress: () => resolve('document') },
        { text: 'Cancel',   style: 'cancel', onPress: () => resolve(null) },
      ]);
    }
  });
}
