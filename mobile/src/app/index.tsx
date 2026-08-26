import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '@/context/LanguageContext';
import { withAlpha } from '@/utilities/color';
import { COLORS, F, FONT_SIZE, RADIUS, SPACING, lineHeightFor } from '@/utilities/constants';

// Full-bleed photo of the people Kolab connects, sitting behind the brand
// headline the same way the auth screens carry it.
const HERO = require('@/assets/images/login/login.jpg');
const HIGHLIGHT = COLORS.brinjal1;

// ─── Welcome Screen ───────────────────────────────────────────────────────────

// Single intro screen + entry CTAs. Navigation away from here (once the user
// taps Get Started, or once RootNavigator (src/app/_layout.tsx) determines
// they're already signed in) is entirely owned by RootNavigator — this screen
// itself never redirects on a timer. It used to auto-redirect unauthenticated
// users straight to /login the instant auth-loading resolved, which meant this
// screen was never actually seen; RootNavigator now leaves unauthenticated
// users parked here until they choose Get Started or Log in.
export default function WelcomeScreen() {
  const { t } = useLanguage();
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(contentOpacity, { toValue: 1, duration: 420, useNativeDriver: true }).start();
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Backdrop — the photo fills the screen; a vertical brand wash keeps it
          soft up top and deep enough at the bottom for white text + CTAs. */}
      <ExpoImage source={HERO} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
      <LinearGradient
        colors={[withAlpha(COLORS.brinjal2, 0.15), withAlpha(COLORS.brinjal2, 0.55), withAlpha(COLORS.brinjal2, 0.96)]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Animated.View style={{ flex: 1, width: '100%', opacity: contentOpacity }}>
          <View style={styles.spacer} />

          <View style={styles.content}>
            <View style={styles.headlineBlock}>
              <Text style={styles.headline}>{t('welcome.headline1')}</Text>
              <Text style={styles.headline}>{t('welcome.headline2')}</Text>
              <Text style={styles.headline}>{t('welcome.headline3')}</Text>
            </View>

            {/* ─── Entry CTAs ─── */}
            <Pressable
              onPress={() => router.push('/account-type')}
              style={({ pressed }) => [styles.primaryBtn, { opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
              <Text style={styles.primaryBtnText}>{t('welcome.getStarted')}</Text>
            </Pressable>

            <Pressable onPress={() => router.push('/login')} hitSlop={8} style={styles.loginRow}>
              <Text style={styles.loginPrompt}>{t('welcome.alreadyHaveAccount')} </Text>
              <Text style={styles.loginLink}>{t('welcome.logIn')}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.brinjal2 },
  safe: { flex: 1 },

  spacer: { flex: 1 },
  content: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.md, gap: SPACING.md },

  headlineBlock: { marginBottom: SPACING.lg },
  headline: {
    color: '#fff',
    fontSize: FONT_SIZE.xxl,
    fontFamily: F.extrabold,
    lineHeight: lineHeightFor(FONT_SIZE.xxl),
  },

  primaryBtn: { height: 54, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center', backgroundColor: HIGHLIGHT },
  primaryBtnText: { fontSize: FONT_SIZE.md, color: '#fff', fontFamily: F.bold, letterSpacing: 0.3 },

  loginRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.sm },
  loginPrompt: { fontSize: FONT_SIZE.sm, color: withAlpha('#FFFFFF', 0.8), fontFamily: F.medium },
  loginLink: { fontSize: FONT_SIZE.sm, fontFamily: F.bold, color: '#fff' },
});
