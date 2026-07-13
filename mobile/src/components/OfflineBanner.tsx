import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useLanguage } from '@/context/LanguageContext';
import { F } from '@/utilities/constants';

const HIDDEN_Y = -80;
const RECONNECTED_VISIBLE_MS = 1800;

// Persistent (not auto-dismissing like Toast) status bar shown app-wide
// whenever there's no connection, plus a brief "Back online" confirmation
// when connectivity returns — mounted once at the root, above everything else.
export function OfflineBanner() {
  const { isOnline, reconnectedAt } = useNetworkStatus();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const translateY = useRef(new Animated.Value(HIDDEN_Y)).current;

  useEffect(() => {
    if (!isOnline) {
      setVisible(true);
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }).start();
      return;
    }

    if (reconnectedAt) {
      setVisible(true);
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }).start();
      const timer = setTimeout(() => {
        Animated.timing(translateY, { toValue: HIDDEN_Y, duration: 220, useNativeDriver: true })
          .start(() => setVisible(false));
      }, RECONNECTED_VISIBLE_MS);
      return () => clearTimeout(timer);
    }

    Animated.timing(translateY, { toValue: HIDDEN_Y, duration: 180, useNativeDriver: true })
      .start(() => setVisible(false));
  }, [isOnline, reconnectedAt, translateY]);

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        { paddingTop: insets.top + 6, backgroundColor: isOnline ? '#16A34A' : '#DC2626', transform: [{ translateY }] },
      ]}>
      <Ionicons name={isOnline ? 'cloud-done-outline' : 'cloud-offline-outline'} size={14} color="#fff" />
      <Text style={styles.text}>{isOnline ? t('common.backOnline') : t('common.offline')}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9998,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingBottom: 8,
  },
  text: { color: '#fff', fontSize: 12, fontFamily: F.semibold },
});
