import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '@/context/LanguageContext';
import { COLORS, F, FONT_SIZE, RADIUS, SPACING } from '@/utilities/constants';

// One illustration per slide, each matched to that slide's message: a creator
// filming content (slide 1), a business discovering creators/photographers
// across social platforms (slide 2), and the two sides collaborating (slide 3).
const SLIDES = [
  {
    image: require('@/assets/images/login/creator.png'),
    headlineKey: 'welcome.slide1Headline',
    highlightKey: 'welcome.slide1HeadlineHighlight',
    subtitleKey: 'welcome.slide1Subtitle',
  },
  {
    image: require('@/assets/images/login/creator2.jpg'),
    headlineKey: 'welcome.slide2Headline',
    highlightKey: 'welcome.slide2HeadlineHighlight',
    subtitleKey: 'welcome.slide2Subtitle',
  },
  {
    image: require('@/assets/images/login/creator3.png'),
    headlineKey: 'welcome.slide3Headline',
    highlightKey: 'welcome.slide3HeadlineHighlight',
    subtitleKey: 'welcome.slide3Subtitle',
  },
] as const;
const LAST_SLIDE = SLIDES.length - 1;

// Brinjal is the same brand purple the native splash screen uses (app.json → expo-splash-screen.backgroundColor).
const BACKGROUND = '#FFFFFF';
const HIGHLIGHT  = COLORS.brinjal1;
const TEXT       = '#171321';
const MUTED      = '#6B7280';

// ─── Welcome Screen ───────────────────────────────────────────────────────────

// Three-slide intro carousel + entry CTAs. Navigation away from here (once the
// user taps Get Started, or once RootNavigator (src/app/_layout.tsx)
// determines they're already signed in) is entirely owned by RootNavigator —
// this screen itself never redirects on a timer. It used to auto-redirect
// unauthenticated users straight to /login the instant auth-loading resolved,
// which meant this screen was never actually seen; RootNavigator now leaves
// unauthenticated users parked here until they choose Get Started or Log in.
export default function WelcomeScreen() {
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(contentOpacity, { toValue: 1, duration: 420, useNativeDriver: true }).start();
  }, []);

  const goToSlide = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
    setSlideIndex(index);
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setSlideIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Animated.View style={{ flex: 1, width: '100%', opacity: contentOpacity }}>

          {/* Slideshow — centered in the space above the CTAs, which stay
              pinned to the bottom of the screen rather than floating just
              under the carousel. */}
          <View style={styles.slideshow}>
            <ScrollView
              ref={scrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onScrollEnd}
              style={styles.carousel}>
              {SLIDES.map((slide, i) => (
                <View key={i} style={[styles.slide, { width }]}>

                  {/* ─── Illustration ─── */}
                  <View style={styles.photoWrap}>
                    <Image source={slide.image} style={styles.heroImage} resizeMode="contain" />
                  </View>

                  {/* ─── Headline ─── */}
                  <Text style={styles.headline}>
                    {t(slide.headlineKey)}{'\n'}
                    <Text style={{ color: HIGHLIGHT }}>{t(slide.highlightKey)}</Text>
                  </Text>
                  <Text style={styles.subtitle}>{t(slide.subtitleKey)}</Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.dots}>
              {SLIDES.map((_, i) => (
                <Pressable key={i} onPress={() => goToSlide(i)} hitSlop={8}>
                  <View style={[styles.dot, i === slideIndex && styles.dotActive]} />
                </Pressable>
              ))}
            </View>
          </View>

          {/* ─── Entry CTAs ─── pinned to the bottom of the screen. */}
          <View style={styles.ctaBlock}>
            {slideIndex === LAST_SLIDE ? (
              <Pressable
                onPress={() => router.push('/account-type')}
                style={({ pressed }) => [styles.primaryBtn, { opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
                <Text style={styles.primaryBtnText}>{t('welcome.getStarted')}</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => goToSlide(slideIndex + 1)}
                style={({ pressed }) => [styles.primaryBtn, { opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
                <Text style={styles.primaryBtnText}>{t('welcome.next')}</Text>
              </Pressable>
            )}

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
  root: { flex: 1, backgroundColor: BACKGROUND },
  safe: { flex: 1, alignItems: 'center' },

  slideshow: { flex: 1, width: '100%', justifyContent: 'center' },
  carousel: { flexGrow: 0 },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.xl },

  photoWrap: { width: 260, height: 240, alignItems: 'center', justifyContent: 'center' },
  heroImage: { width: '100%', height: '100%' },

  headline: {
    marginTop: SPACING.lg, textAlign: 'center', color: TEXT,
    fontSize: 26, lineHeight: 39, fontFamily: F.bold,
  },
  subtitle: {
    marginTop: SPACING.sm, textAlign: 'center', color: MUTED,
    fontSize: FONT_SIZE.sm, lineHeight: 20, fontFamily: F.medium,
  },

  dots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: SPACING.xl },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(23,19,33,0.15)' },
  dotActive: { width: 20, backgroundColor: HIGHLIGHT },

  ctaBlock: { width: '100%', paddingHorizontal: SPACING.xl, paddingTop: SPACING.xxl, gap: SPACING.md },

  primaryBtn:     { height: 54, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center', backgroundColor: HIGHLIGHT },
  primaryBtnText: { fontSize: FONT_SIZE.md, color: '#fff', fontFamily: F.bold, letterSpacing: 0.3 },

  loginRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.sm },
  loginPrompt: { fontSize: FONT_SIZE.sm, color: MUTED, fontFamily: F.medium },
  loginLink:   { fontSize: FONT_SIZE.sm, fontFamily: F.bold, color: HIGHLIGHT },
});
