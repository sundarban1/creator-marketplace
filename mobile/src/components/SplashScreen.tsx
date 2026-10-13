import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { AppState, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, Keyframe, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useLanguage } from '@/context/LanguageContext';
import { RADIUS } from '@/utilities/constants';

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
const FADE_START = TOTAL * 0.72;

// Keep the native splash up until this overlay has actually laid out —
// otherwise expo-router's auto-hide can drop it a few frames before the
// overlay paints, flashing the welcome screen underneath.
ExpoSplashScreen.preventAutoHideAsync().catch(() => {});

// The branded splash belongs to a cold start only. If anything above it ever
// remounts the root tree mid-session (logout used to), it must not replay.
let shownThisLaunch = false;

// The logo deliberately does NOT animate in — the native splash
// (app.json → expo-splash-screen) already shows this exact outlined wordmark
// (splash-icon.png, rendered from kolab-outlined.svg), centred on the same
// #4F46E5, so this overlay has to continue from that frame unchanged.
// Any scale/fade-in here would read as the logo popping a second time right after launch.

const textKf = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: 20 }] },
  46: { opacity: 0, transform: [{ translateY: 20 }] },
  72: { opacity: 1, transform: [{ translateY: 0 }], easing: Easing.out(Easing.ease) },
  100: { opacity: 1, transform: [{ translateY: 0 }] },
});

export function SplashScreen() {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(() => !shownThisLaunch);
  // The container must NOT use a reanimated `entering` animation: on the new
  // architecture a view with `entering` stays hidden until the animation
  // kicks off, so for a few frames the welcome screen showed through, then
  // the indigo overlay popped in on top ("Get Started → blink → splash →
  // Get Started"). Plain opacity 1 from the first frame, fade driven here.
  const opacity = useSharedValue(1);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  // This branded overlay is now covering the screen, so the native splash
  // underneath has nothing left to do — hide it explicitly rather than
  // relying on expo-router's auto-hide, which has been seen to no-op on
  // Android and leave the native splash wedged on top of everything.
  const hideNative = () => { ExpoSplashScreen.hideAsync().catch(() => {}); };

  useEffect(() => {
    if (!visible) { hideNative(); return; }
    shownThisLaunch = true;
    opacity.set(withDelay(
      FADE_START,
      withTiming(0, { duration: TOTAL - FADE_START, easing: Easing.in(Easing.ease) }),
    ));
    // Backstop in case onLayout never fires — never leave the native splash up.
    const hideTimer = setTimeout(hideNative, 1000);
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
      clearTimeout(hideTimer);
      clearTimeout(timer);
      sub.remove();
    };
    // Mount-only: decides once whether this launch's splash plays.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, fadeStyle]} onLayout={hideNative}>

      {/* Background decoration */}
      <View style={styles.bubble1} />
      <View style={styles.bubble2} />
      <View style={styles.bubble3} />
      <View style={styles.bubble4} />

      {/* Logo — static, matching the native splash frame it hands off from */}
      {/* No card — like the login page, the wordmark carries its own white
          outline (kolab-outlined.svg) so it reads straight on the indigo */}
      <Image source={require('@/assets/images/kolab-outlined.svg')} style={styles.logoImage} contentFit="contain" />

      {/* Tagline — sits just below the logo card, absolutely positioned off
          the vertical centre so revealing it never nudges the centred logo
          off the spot the native splash left it in */}
      <Animated.View entering={textKf.duration(TOTAL)} style={styles.textBlock}>
        <Text style={styles.tagline}>{t('splash.tagline')}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const LOGO_W = Platform.OS === 'android' ? 175 : 221;

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
  logoImage: {
    // Matches the native splash: splash-icon.png is 942px wide, with the
    // wordmark filling 840px of it. iOS shows it at imageWidth 248 → ~221pt.
    // Android 12+ masks the splash icon to a 192dp circle, so app.json gives
    // Android imageWidth 196 → ~175dp, small enough that "k" and "b" aren't clipped.
    width: LOGO_W,
    height: LOGO_W * (114 / 387), // kolab-outlined.svg viewBox aspect
  },
  textBlock: {
    position: 'absolute',
    left: 0,
    right: 0,
    // Anchored to the screen's vertical centre (where the logo sits) and
    // pushed down past the logo's lower edge so the tagline reads directly
    // below the logo instead of near the bottom of the screen.
    top: '50%',
    marginTop: 60,
    alignItems: 'center',
    gap: 8,
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.72)',
    letterSpacing: 0.2,
  },
});
