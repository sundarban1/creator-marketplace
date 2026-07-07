import * as ImagePicker from 'expo-image-picker';
import { isDevice } from 'expo-device';
import { Alert, ActionSheetIOS, Platform } from 'react-native';
import { API_BASE } from '@/lib/api';
import { storage } from '@/utilities/storage';
import { ACCESS_TOKEN_KEY } from '@/utilities/constants';

export type UploadTarget = 'creator-avatar' | 'business-logo' | 'creator-citizenship' | 'business-pan' | 'business-company-reg';

const TARGET_CONFIG: Record<UploadTarget, { path: string; field: string; cropSquare: boolean }> = {
  'creator-avatar':      { path: '/api/creator/avatar',      field: 'avatar',   cropSquare: true  },
  'business-logo':       { path: '/api/business/logo',       field: 'logo',     cropSquare: true  },
  'creator-citizenship': { path: '/api/creator/citizenship', field: 'document', cropSquare: false },
  'business-pan':            { path: '/api/business/documents/pan',         field: 'document', cropSquare: false },
  'business-company-reg':    { path: '/api/business/documents/company-reg', field: 'document', cropSquare: false },
};

async function pickFromLibrary(cropSquare: boolean): Promise<ImagePicker.ImagePickerAsset | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission required', 'Please allow access to your photo library in Settings.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    ...(cropSquare ? { allowsEditing: true, aspect: [1, 1] as [number, number] } : {}),
    quality: 0.85,
  });
  return result.canceled ? null : result.assets[0];
}

async function pickFromCamera(cropSquare: boolean): Promise<ImagePicker.ImagePickerAsset | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission required', 'Please allow camera access in Settings.');
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({
    ...(cropSquare ? { allowsEditing: true, aspect: [1, 1] as [number, number] } : {}),
    quality: 0.85,
  });
  return result.canceled ? null : result.assets[0];
}

function showIOSSheet(): Promise<'library' | 'camera' | null> {
  return new Promise((resolve) => {
    const options = isDevice
      ? ['Choose from Library', 'Take Photo', 'Cancel']
      : ['Choose from Library', 'Cancel'];
    const cancelIndex = options.length - 1;
    ActionSheetIOS.showActionSheetWithOptions(
      { options, cancelButtonIndex: cancelIndex },
      (idx) => {
        if (idx === 0) resolve('library');
        else if (isDevice && idx === 1) resolve('camera');
        else resolve(null);
      },
    );
  });
}

function showAndroidAlert(): Promise<'library' | 'camera' | null> {
  return new Promise((resolve) => {
    const buttons: Parameters<typeof Alert.alert>[2] = [
      { text: 'Choose from Library', onPress: () => resolve('library') },
      ...(isDevice ? [{ text: 'Take Photo', onPress: () => resolve('camera') }] : []),
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
    ];
    Alert.alert('Update Photo', 'Choose how to add your photo', buttons);
  });
}

async function promptSource(): Promise<'library' | 'camera' | null> {
  return Platform.OS === 'ios' ? showIOSSheet() : showAndroidAlert();
}

export type DocStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
export type UploadResult = { url: string; status?: DocStatus };

async function uploadAsset(asset: ImagePicker.ImagePickerAsset, target: UploadTarget): Promise<UploadResult> {
  const { path, field } = TARGET_CONFIG[target];
  const token = storage.get(ACCESS_TOKEN_KEY) ?? '';

  const ext      = asset.uri.split('.').pop() ?? 'jpg';
  const mimeType = asset.mimeType ?? `image/${ext === 'jpg' ? 'jpeg' : ext}`;

  const form = new FormData();
  form.append(field, { uri: asset.uri, name: `photo.${ext}`, type: mimeType } as unknown as Blob);

  const res = await fetch(`${API_BASE}${path}`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}` },
    body:    form,
  });

  const json = await res.json() as { success: boolean; data: Record<string, string>; message?: string };
  if (!res.ok) throw new Error(json.message ?? 'Upload failed');

  return {
    url: json.data.avatarUrl ?? json.data.logoUrl ?? json.data.docUrl ?? '',
    // Only document uploads (pan/company-reg/citizenship) return a status —
    // the server, not the client, is the source of truth for review state.
    status: (json.data.panDocStatus ?? json.data.companyRegDocStatus ?? json.data.citizenshipStatus) as DocStatus | undefined,
  };
}

export async function pickAndUpload(target: UploadTarget): Promise<UploadResult | null> {
  const source = await promptSource();
  if (!source) return null;

  const { cropSquare } = TARGET_CONFIG[target];
  const asset = source === 'library' ? await pickFromLibrary(cropSquare) : await pickFromCamera(cropSquare);
  if (!asset) return null;

  return uploadAsset(asset, target);
}
