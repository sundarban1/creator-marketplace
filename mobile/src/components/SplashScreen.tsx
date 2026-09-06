import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { AppState, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { useLanguage } from '@/context/LanguageContext';
import { RADIUS, SHADOW } from '@/utilities/constants';

const TOTAL = 2400;
// The splash overlay is dismissed by this timer, NOT by the reanimated
// entering animation's finish callback. On Android that callback is
// unreliable — it can fire with `finished: false` (or never) when the JS
// thread is busy during cold start, and it is *guaranteed* to be lost when
// the biometric prompt pauses the Activity mid-animation on a fingerprint
// login. Either case used to leave this full-screen indigo overlay stuck on
// top of the real app forever. The timer is the source of truth; the
// keyframe below is now purely the fade-out visual.
const DISMISS_AFTER = TOTAL + 400;

const containerKf = new Keyframe({
  0: { opacity: 1 },
  72: { opacity: 1 },
  100: { opacity: 0, easing: Easing.in(Easing.ease) },
});

// The logo card deliberately does NOT animate in — the native splash
// (app.json → expo-splash-screen) already shows this exact white wordmark
// card, centred on the same #4F46E5, so this overlay has to continue from
// that frame unchanged. Any scale/fade-in here would read as the logo
// popping a second time right after launch.

const textKf = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: 20 }] },
  46: { opacity: 0, transform: [{ translateY: 20 }] },
  72: { opacity: 1, transform: [{ translateY: 0 }], easing: Easing.out(Easing.ease) },
  100: { opacity: 1, transform: [{ translateY: 0 }] },
});

export function SplashScreen() {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // This branded overlay is now covering the screen, so the native splash
    // underneath has nothing left to do — hide it explicitly rather than
    // relying on expo-router's auto-hide, which has been seen to no-op on
    // Android and leave the native splash wedged on top of everything.
    ExpoSplashScreen.hideAsync().catch(() => {});

    const timer = setTimeout(() => setVisible(false), DISMISS_AFTER);
    // Safety net: if the app is backgrounded while the splash is up (the
    // biometric system dialog taking focus on a fingerprint cold-start login),
    // reanimated halts and the fade can freeze — tear the overlay down the
    // moment we're foregrounded again so it can never sit stuck on top.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        clearTimeout(timer);
        setVisible(false);
      }
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, []);

  if (!visible) return null;

  return (
    <Animated.View
      entering={containerKf.duration(TOTAL)}
      style={styles.container}>

      {/* Background decoration */}
      <View style={styles.bubble1} />
      <View style={styles.bubble2} />
      <View style={styles.bubble3} />
      <View style={styles.bubble4} />

      {/* Logo — static, matching the native splash frame it hands off from */}
      <View style={styles.logoCard}>
        <Image source={require('@/assets/images/logo.png')} style={styles.logoImage} contentFit="contain" />
      </View>

      {/* Tagline — sits just below the logo card, absolutely positioned off
          the vertical centre so revealing it never nudges the centred logo
          off the spot the native splash left it in */}
      <Animated.View entering={textKf.duration(TOTAL)} style={styles.textBlock}>
        <Text style={styles.tagline}>{t('splash.tagline')}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#4F46E5',
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble1: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -100,
    right: -80,
  },
  bubble2: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -60,
    left: -70,
  },
  bubble3: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.04)',
    top: '32%',
    left: -30,
  },
  bubble4: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: '28%',
    right: 18,
  },
  logoCard: {
    borderRadius: RADIUS.xl,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 18,
    ...SHADOW.floating,
    shadowColor: '#000',
  },
  logoImage: {
    width: 200,
    height: 200 * (428 / 1200),
  },
  textBlock: {
    position: 'absolute',
    left: 0,
    right: 0,
    // Anchored to the screen's vertical centre (where the logo card sits) and
    // pushed down past the card's lower edge so the tagline reads directly
    // below the logo instead of near the bottom of the screen.
    top: '50%',
    marginTop: 84,
    alignItems: 'center',
    gap: 8,
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.72)',
    letterSpacing: 0.2,
  },
});
