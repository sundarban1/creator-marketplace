import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { F, SPACING } from '@/utilities/constants';

const STORE_URL = Platform.select({
  ios:     'https://apps.apple.com/app/id6792723762',
  android: 'https://play.google.com/store/apps/details?id=com.sundarban.kolab',
  default: 'https://ourkolab.com',
});

// A hard block, not a dismissible nudge — shown instead of the normal app tree
// (see _layout.tsx's RootNavigator) when the installed build is older than the
// admin-configured app.minVersion.{ios,android} platform setting. There is no
// escape hatch by design: an outdated build talking to a since-changed API is
// the failure mode this exists to prevent.
export function ForceUpdateScreen() {
  const C = useAppColors();
  const { t } = useLanguage();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: C.primaryLight }]}>
          <FontAwesome5 name="arrow-circle-up" size={44} color={C.brinjal1} solid />
        </View>
        <Text style={[styles.title, { color: C.text }]}>{t('forceUpdate.title')}</Text>
        <Text style={[styles.subtitle, { color: C.textSecondary }]}>{t('forceUpdate.subtitle')}</Text>

        <Pressable
          style={[styles.primaryBtn, { backgroundColor: C.brinjal1, shadowColor: C.brinjal1 }]}
          onPress={() => Linking.openURL(STORE_URL!)}>
          <Text style={styles.primaryBtnText}>{t('forceUpdate.updateBtn')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content:   { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.xxl },
  iconWrap:  { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title:     { fontSize: 22, fontFamily: F.bold, marginBottom: 8 },
  subtitle:  { fontSize: 14, fontFamily: F.regular, textAlign: 'center' },
  primaryBtn: {
    marginTop: 28, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 14,
    shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontFamily: F.semibold },
});
