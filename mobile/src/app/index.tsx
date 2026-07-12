import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { F } from '@/utilities/constants';

const PINK    = '#E8527A';
const TEAL    = '#2EC4C4';

// ─── Scattered icon ────────────────────────────────────────────────────────────

type IconProps = {
  icon: keyof typeof Ionicons.glyphMap;
  size?: number;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
  rotate?: string;
  color?: string;
  opacity?: number;
};

function FIcon({
  icon, size = 32, top, left, right, bottom,
  rotate = '0deg', color = TEAL, opacity = 0.72,
}: IconProps) {
  return (
    <View style={{ position: 'absolute', top, left, right, bottom, opacity, transform: [{ rotate }] }}>
      <Ionicons name={icon} size={size} color={color} />
    </View>
  );
}

// ─── Scattered text label ──────────────────────────────────────────────────────

type LabelProps = {
  text: string;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
  rotate?: string;
  color?: string;
  fontSize?: number;
  opacity?: number;
  weight?: '600' | '700' | '900';
};

function FLabel({
  text, top, left, right, bottom,
  rotate = '0deg', color = PINK, fontSize = 14, opacity = 0.82, weight = '700',
}: LabelProps) {
  return (
    <View style={{ position: 'absolute', top, left, right, bottom, opacity, transform: [{ rotate }] }}>
      <Text style={{ color, fontSize, fontWeight: weight, fontStyle: 'italic' }}>{text}</Text>
    </View>
  );
}

// ─── Pill block label (FOLLOW / Social Media style) ───────────────────────────

function FBlock({
  lines, top, left, right, bottom, rotate = '0deg', color = PINK,
}: { lines: string[]; top?: number; left?: number; right?: number; bottom?: number; rotate?: string; color?: string }) {
  return (
    <View style={{ position: 'absolute', top, left, right, bottom, backgroundColor: color, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, transform: [{ rotate }], opacity: 0.88 }}>
      {lines.map((l, i) => (
        <Text key={i} style={{ color: '#fff', fontSize: i === 0 ? 16 : 20, fontWeight: '900', fontStyle: 'italic', lineHeight: i === 0 ? 20 : 24 }}>{l}</Text>
      ))}
    </View>
  );
}

// ─── Pulse dot ────────────────────────────────────────────────────────────────

function PulseDot({ delay, color }: { delay: number; color: string }) {
  const scale   = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale,   { toValue: 1.45, duration: 500, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1,    duration: 500, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale,   { toValue: 1,   duration: 500, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.5, duration: 500, useNativeDriver: true }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, transform: [{ scale }], opacity }} />;
}

// ─── Splash Screen ────────────────────────────────────────────────────────────

// Pure splash visual — navigation away from here is entirely owned by RootNavigator
// (src/app/_layout.tsx), which already redirects based on auth state including the
// isFirstLogin -> onboarding case. This screen used to also run its own redirect
// effect that ignored isFirstLogin entirely, so a first-time user would briefly land
// on onboarding (via RootNavigator) and then get yanked back to the main app by this
// screen's own delayed timer a moment later — the "double slide" bug.
export default function SplashScreen() {
  const logoScale   = useRef(new Animated.Value(0.35)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const tagOpacity  = useRef(new Animated.Value(0)).current;
  const dotsOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, useNativeDriver: true, tension: 55, friction: 8 }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 480, useNativeDriver: true }),
      ]),
      Animated.timing(textOpacity, { toValue: 1, duration: 360, useNativeDriver: true }),
      Animated.timing(tagOpacity,  { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(dotsOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.root}>

      {/* ─── Doodle layer ─── */}

      {/* Top row */}
      <FIcon  icon="camera"             size={52}  top={66}  left={24}   rotate="-10deg" color={TEAL} />
      <FLabel text="wow"                           top={52}  left={104}  rotate="5deg"  color={TEAL}  fontSize={17} />
      <FIcon  icon="desktop-outline"    size={50}  top={62}  right={20}  rotate="7deg"  color={PINK} />
      <FLabel text="http://"                       top={66}  right={76}  rotate="-4deg" color="#444"  fontSize={11} opacity={0.4} />
      <FLabel text="like"                          top={52}  left={170}  rotate="-4deg" color={PINK}  fontSize={14} />
      <FIcon  icon="at-circle"          size={38}  top={128} left={14}   rotate="12deg" color={PINK}  opacity={0.6} />
      <FIcon  icon="heart"              size={22}  top={140} right={56}  rotate="14deg" color={PINK}  opacity={0.8} />
      <FLabel text="REPOST"                        top={196} left={120}  rotate="-3deg" color={PINK}  fontSize={12} weight="900" opacity={0.7} />

      {/* Upper-mid */}
      <FIcon  icon="arrow-up"           size={28}  top={192} left={18}   rotate="-30deg" color={TEAL} opacity={0.6} />
      <FIcon  icon="wifi"               size={34}  top={230} left={72}   rotate="-5deg"  color={TEAL} opacity={0.62} />
      <FIcon  icon="laptop-outline"     size={50}  top={196} right={10}  rotate="6deg"   color={TEAL} />
      <FIcon  icon="radio-button-on"    size={24}  top={252} right={66}  rotate="0deg"   color={TEAL} opacity={0.55} />

      {/* FOLLOW block */}
      <FBlock lines={['FOLLOW']} top={290} left={10} rotate="-6deg" color={PINK} />

      {/* Mid */}
      <FIcon  icon="phone-portrait-outline" size={38} top={360} left={12}  rotate="9deg"  color={PINK} opacity={0.65} />
      <FLabel text="HELLO"                           top={374} right={52} rotate="-5deg" color={TEAL} fontSize={20} weight="900" opacity={0.8} />
      <FIcon  icon="headset-outline"    size={44}  top={416} right={12}  rotate="8deg"   color={TEAL} opacity={0.68} />
      <FLabel text="online"                          top={470} right={64} rotate="-6deg" color={PINK} fontSize={15} opacity={0.82} />
      <FIcon  icon="arrow-down"         size={26}  top={510} left={22}   rotate="18deg"  color={PINK} opacity={0.58} />
      <FIcon  icon="star"               size={20}  top={490} left={90}   rotate="12deg"  color={TEAL} opacity={0.6} />

      {/* Social Media block */}
      <FBlock lines={['Social', 'Media']} bottom={220} left={0} rotate="-2deg" color={TEAL} />

      <FLabel text="online"                          bottom={218} left={14}  rotate="-5deg" color={TEAL} fontSize={11} opacity={0.65} />
      <FIcon  icon="arrow-back"         size={28}  bottom={262} left={96}  rotate="170deg" color={TEAL} opacity={0.55} />
      <FLabel text=".com"                            bottom={204} left={134} rotate="5deg"  color="#444" fontSize={14} opacity={0.45} />

      {/* Bottom */}
      <FIcon  icon="headset"            size={40}  bottom={152} left={52}  rotate="6deg"   color={TEAL} opacity={0.62} />
      <FIcon  icon="mail"               size={42}  bottom={164} right={14} rotate="-9deg"  color={PINK} opacity={0.68} />
      <FLabel text="LIKE"                           bottom={118} left={114} rotate="-8deg" color={PINK}  fontSize={20} weight="900" opacity={0.82} />
      <FLabel text="Hi!"                            bottom={128} right={46} rotate="10deg" color="#D94F5C" fontSize={24} weight="900" opacity={0.85} />
      <FIcon  icon="tablet-portrait-outline" size={36} bottom={76} left={14} rotate="-12deg" color={PINK} opacity={0.6} />
      <FIcon  icon="phone-portrait"     size={22}  bottom={60}  left={56}  rotate="6deg"   color={TEAL} opacity={0.55} />

      {/* ─── Center content ─── */}
      <View style={styles.center}>

        {/* Role chips */}
        <View style={styles.roleRow}>
          <View style={[styles.chip, { backgroundColor: `${PINK}1A`, borderColor: `${PINK}50` }]}>
            <Ionicons name="camera-outline" size={12} color={PINK} />
            <Text style={[styles.chipText, { color: PINK }]}>Creator</Text>
          </View>
          <View style={styles.chipDivider} />
          <View style={[styles.chip, { backgroundColor: `${TEAL}1A`, borderColor: `${TEAL}50` }]}>
            <Ionicons name="briefcase-outline" size={12} color={TEAL} />
            <Text style={[styles.chipText, { color: TEAL }]}>Business</Text>
          </View>
        </View>

        {/* Logo */}
        <Animated.View style={{ transform: [{ scale: logoScale }], opacity: Animated.multiply(logoOpacity, textOpacity) }}>
          <Image source={require('@/assets/images/logo.png')} style={styles.logoImage} resizeMode="contain" />
        </Animated.View>

        {/* Tagline */}
        <Animated.Text style={[styles.tagline, { opacity: tagOpacity }]}>
          Where creators meet brands
        </Animated.Text>
      </View>

      {/* ─── Loading dots ─── */}
      <Animated.View style={[styles.dotsRow, { opacity: dotsOpacity }]}>
        <PulseDot delay={0}   color={PINK} />
        <PulseDot delay={180} color={TEAL} />
        <PulseDot delay={360} color={PINK} />
      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F8FC', alignItems: 'center', justifyContent: 'center' },

  center: { alignItems: 'center', zIndex: 10 },

  roleRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 32, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: 'rgba(0,0,0,0.03)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.07)' },
  chip:        { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  chipText:    { fontSize: 12, letterSpacing: 0.3, fontFamily: F.bold },
  chipDivider: { width: 1, height: 14, backgroundColor: 'rgba(0,0,0,0.12)' },

  logoImage: { width: 220, height: 220 / (1740 / 620) },

  tagline:  { fontSize: 14, color: '#888', marginTop: 8, letterSpacing: 0.4, fontFamily: F.medium },

  dotsRow: { position: 'absolute', bottom: 56, flexDirection: 'row', gap: 9, alignItems: 'center' },
});
