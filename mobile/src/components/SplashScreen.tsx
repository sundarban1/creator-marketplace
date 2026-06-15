import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const TOTAL = 2400;

const containerKf = new Keyframe({
  0: { opacity: 1 },
  72: { opacity: 1 },
  100: { opacity: 0, easing: Easing.in(Easing.ease) },
});

const logoKf = new Keyframe({
  0: { transform: [{ scale: 0.25 }], opacity: 0 },
  28: { transform: [{ scale: 1.14 }], opacity: 1, easing: Easing.out(Easing.back(2)) },
  42: { transform: [{ scale: 0.96 }], opacity: 1 },
  52: { transform: [{ scale: 1 }], opacity: 1 },
  100: { transform: [{ scale: 1 }], opacity: 1 },
});

const textKf = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: 28 }] },
  38: { opacity: 0, transform: [{ translateY: 28 }] },
  68: { opacity: 1, transform: [{ translateY: 0 }], easing: Easing.out(Easing.ease) },
  100: { opacity: 1, transform: [{ translateY: 0 }] },
});

const dotsKf = new Keyframe({
  0: { opacity: 0 },
  55: { opacity: 0 },
  80: { opacity: 1 },
  100: { opacity: 1 },
});

export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  return (
    <Animated.View
      entering={containerKf.duration(TOTAL).withCallback((finished) => {
        'worklet';
        if (finished) scheduleOnRN(setVisible, false);
      })}
      style={styles.container}>

      {/* Background decoration */}
      <View style={styles.bubble1} />
      <View style={styles.bubble2} />
      <View style={styles.bubble3} />
      <View style={styles.bubble4} />

      {/* Logo */}
      <Animated.View entering={logoKf.duration(TOTAL)} style={styles.logoOuter}>
        <View style={styles.glowRing} />
        <View style={styles.logo}>
          <View style={styles.logoAccentLarge} />
          <View style={styles.logoAccentSmall} />
          <View style={styles.logoLetters}>
            <Text style={styles.letterC}>C</Text>
            <Text style={styles.letterM}>M</Text>
          </View>
        </View>
      </Animated.View>

      {/* Text */}
      <Animated.View entering={textKf.duration(TOTAL)} style={styles.textBlock}>
        <Text style={styles.appName}>CreatorMarket</Text>
        <Text style={styles.tagline}>Where creators meet brands</Text>
      </Animated.View>

      {/* Dots */}
      <Animated.View entering={dotsKf.duration(TOTAL)} style={styles.dotsRow}>
        <View style={[styles.dot, styles.dotSm]} />
        <View style={styles.dot} />
        <View style={[styles.dot, styles.dotSm]} />
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
    borderRadius: 180,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -100,
    right: -80,
  },
  bubble2: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -60,
    left: -70,
  },
  bubble3: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.04)',
    top: '32%',
    left: -30,
  },
  bubble4: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: '28%',
    right: 18,
  },
  logoOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  glowRing: {
    position: 'absolute',
    width: 152,
    height: 152,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  logo: {
    width: 114,
    height: 114,
    borderRadius: 30,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 20,
  },
  logoAccentLarge: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#EDE9FE',
    bottom: -23,
    left: -23,
  },
  logoAccentSmall: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#DDD6FE',
    top: -13,
    right: -10,
  },
  logoLetters: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  letterC: {
    fontSize: 40,
    fontWeight: '900',
    color: '#4F46E5',
    lineHeight: 46,
  },
  letterM: {
    fontSize: 27,
    fontWeight: '700',
    color: '#7C3AED99',
    lineHeight: 46,
    marginTop: 9,
  },
  textBlock: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 64,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.72)',
    letterSpacing: 0.2,
  },
  dotsRow: {
    position: 'absolute',
    bottom: 64,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  dotSm: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
});
