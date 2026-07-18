import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
// SDK 56 moved the function-based API (getInfoAsync etc.) to this subpath —
// the top-level `expo-file-system` export is the newer File/Directory class API.
import * as FileSystem from 'expo-file-system/legacy';
import { isDevice } from 'expo-device';
import { Alert, ActionSheetIOS, Platform } from 'react-native';
import { API_BASE } from '@/lib/api';
import { storage } from '@/utilities/storage';
import { ACCESS_TOKEN_KEY } from '@/utilities/constants';

export type UploadTarget = 'creator-avatar' | 'business-logo' | 'creator-citizenship' | 'creator-pan' | 'business-pan' | 'business-company-reg' | 'campaign-feature';

const TARGET_CONFIG: Record<UploadTarget, { path: string; field: string; aspect?: [number, number]; isDocument?: boolean }> = {
  'creator-avatar':      { path: '/api/creator/avatar',      field: 'avatar',   aspect: [1, 1]  },
  'business-logo':       { path: '/api/business/logo',       field: 'logo',     aspect: [1, 1]  },
  'creator-citizenship': { path: '/api/creator/citizenship', field: 'document', isDocument: true },
  'creator-pan':             { path: '/api/creator/pan',                       field: 'document', isDocument: true },
  'business-pan':            { path: '/api/business/documents/pan',         field: 'document', isDocument: true },
  'business-company-reg':    { path: '/api/business/documents/company-reg', field: 'document', isDocument: true },
  'campaign-feature':        { path: '/api/campaigns/feature-image',        field: 'image', aspect: [16, 9] },
};

// ── Compression ──────────────────────────────────────────────────────────────
// Target ~100–300KB per upload — small enough to keep Cloudinary storage and
// upload bandwidth in check, large enough to stay legible. We treat 300KB as
// a hard ceiling (iteratively drop quality, then dimensions, until under it)
// and don't bother padding naturally-smaller output up to 100KB — a simple
// image that compresses to 60KB is strictly better for storage than a bloated
// one, the range is a rough target for typical photos, not a floor to enforce.
const TARGET_MAX_BYTES = 300 * 1024;
const PHOTO_MAX_DIMENSION = 1600;
const DOCUMENT_MAX_DIMENSION = 2000; // documents need more detail to stay legible
const QUALITY_FLOOR_PHOTO = 0.3;
const QUALITY_FLOOR_DOCUMENT = 0.5;

async function fileSize(uri: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(uri);
  return info.exists ? (info.size ?? 0) : 0;
}

async function renderAt(uri: string, width: number, height: number, quality: number) {
  const rendered = await ImageManipulator.manipulate(uri).resize({ width, height }).renderAsync();
  return rendered.saveAsync({ compress: quality, format: SaveFormat.JPEG });
}

export async function compressImage(
  asset: ImagePicker.ImagePickerAsset,
  isDocument: boolean,
): Promise<{ uri: string; mimeType: string }> {
  const maxDim = isDocument ? DOCUMENT_MAX_DIMENSION : PHOTO_MAX_DIMENSION;
  const qualityFloor = isDocument ? QUALITY_FLOOR_DOCUMENT : QUALITY_FLOOR_PHOTO;

  let width = asset.width;
  let height = asset.height;
  if (Math.max(width, height) > maxDim) {
    const scale = maxDim / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  try {
    let quality = 0.8;
    let result = await renderAt(asset.uri, width, height, quality);
    let size = await fileSize(result.uri);

    let attempts = 0;
    while (size > TARGET_MAX_BYTES && quality > qualityFloor && attempts < 5) {
      quality = Math.max(qualityFloor, quality - 0.15);
      result = await renderAt(asset.uri, width, height, quality);
      size = await fileSize(result.uri);
      attempts += 1;
    }

    // Quality floor reached but still too big — shrink dimensions once more.
    if (size > TARGET_MAX_BYTES) {
      width = Math.round(width * 0.7);
      height = Math.round(height * 0.7);
      result = await renderAt(asset.uri, width, height, qualityFloor);
    }

    return { uri: result.uri, mimeType: 'image/jpeg' };
  } catch {
    // Manipulation failed (e.g. unsupported format) — fall back to the
    // original, uncompressed asset rather than blocking the upload.
    return { uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' };
  }
}

async function pickFromLibrary(aspect?: [number, number]): Promise<ImagePicker.ImagePickerAsset | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission required', 'Please allow access to your photo library in Settings.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    ...(aspect ? { allowsEditing: true, aspect } : {}),
    quality: 0.85,
  });
  return result.canceled ? null : result.assets[0];
}

async function pickFromCamera(aspect?: [number, number]): Promise<ImagePicker.ImagePickerAsset | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission required', 'Please allow camera access in Settings.');
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    ...(aspect ? { allowsEditing: true, aspect } : {}),
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
  const { path, field, isDocument } = TARGET_CONFIG[target];
  const token = storage.get(ACCESS_TOKEN_KEY) ?? '';

  const { uri, mimeType } = await compressImage(asset, !!isDocument);
  const ext = mimeType === 'image/jpeg' ? 'jpg' : (uri.split('.').pop() ?? 'jpg');

  const form = new FormData();
  form.append(field, { uri, name: `photo.${ext}`, type: mimeType } as unknown as Blob);

  const res = await fetch(`${API_BASE}${path}`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}` },
    body:    form,
  });

  const json = await res.json() as { success: boolean; data: Record<string, string>; message?: string };
  if (!res.ok) throw new Error(json.message ?? 'Upload failed');

  return {
    url: json.data.avatarUrl ?? json.data.logoUrl ?? json.data.docUrl ?? json.data.imageUrl ?? '',
    // Only document uploads (pan/company-reg/citizenship) return a status —
    // the server, not the client, is the source of truth for review state.
    status: (json.data.panDocStatus ?? json.data.companyRegDocStatus ?? json.data.citizenshipStatus) as DocStatus | undefined,
  };
}

export async function pickAndUpload(target: UploadTarget): Promise<UploadResult | null> {
  const source = await promptSource();
  if (!source) return null;

  const { aspect } = TARGET_CONFIG[target];
  const asset = source === 'library' ? await pickFromLibrary(aspect) : await pickFromCamera(aspect);
  if (!asset) return null;

  return uploadAsset(asset, target);
}
