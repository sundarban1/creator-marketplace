import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  subscribeToActiveUploads, subscribeToFocusedUploadTarget, isFocusedUploadTarget,
  type ActiveUpload,
} from '@/services/backgroundVideoUploadManager';
import { useLanguage } from '@/context/LanguageContext';
import { F } from '@/utilities/constants';

// Persistent, app-wide "Uploading video…" indicator — mounted once at the
// root (like OfflineBanner, which this mirrors). Only shows an upload whose
// owning chat/deliverables screen isn't currently focused: that screen's own
// inline progress bar takes over the moment it's back on screen, so the two
// never show the same upload's progress twice.
export function GlobalUploadBanner() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [uploads, setUploads] = useState<ActiveUpload[]>([]);
  const [, forceRerender] = useState(0);

  useEffect(() => {
    const unsubUploads = subscribeToActiveUploads(setUploads);
    const unsubFocus = subscribeToFocusedUploadTarget(() => forceRerender((n) => n + 1));
    return () => { unsubUploads(); unsubFocus(); };
  }, []);

  const visible = uploads.filter((u) => !isFocusedUploadTarget(u.target));
  if (visible.length === 0) return null;

  // Oldest first (Map preserves insertion order) — if several are in flight,
  // show the one that's been running longest.
  const primary = visible[0];
  const pct = Math.round(primary.progress * 100);

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 6 }]} pointerEvents="none">
      <ActivityIndicator size="small" color="#fff" style={styles.spinner} />
      <Text style={styles.text}>
        {primary.status === 'finalizing' ? t('messages.processingVideo') : `${t('messages.uploadingVideo')} ${pct}%`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9997,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingBottom: 8, backgroundColor: '#4F46E5',
  },
  spinner: { marginRight: 2 },
  text: { color: '#fff', fontSize: 12, fontFamily: F.semibold },
});
