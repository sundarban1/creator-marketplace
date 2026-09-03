import * as Sentry from '@sentry/react-native';
import { DarkTheme, DefaultTheme, ThemeProvider, useRouter, useSegments } from 'expo-router';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Application from 'expo-application';
import { FontAwesome5 } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_700Bold_Italic,
  Poppins_800ExtraBold,
} from '@expo-google-fonts/poppins';
import { AuthProvider } from '@/context/AuthContext';
import { useAuth } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { AppThemeProvider, useAppColors, useIsDark } from '@/context/ThemeContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { PlatformSettingsProvider, usePlatformFlags } from '@/context/PlatformSettingsContext';
import { SplashScreen } from '@/components/SplashScreen';
import { BiometricGateScreen } from '@/components/BiometricGateScreen';
import { BiometricEnrollPrompt } from '@/components/BiometricEnrollPrompt';
import { ForceUpdateScreen } from '@/components/ForceUpdateScreen';
import { OfflineBanner } from '@/components/OfflineBanner';
import { GlobalUploadBanner } from '@/components/GlobalUploadBanner';
import { ToastProvider } from '@/components/Toast';
import { syncBiometricLoginWithDevice } from '@/services/biometric';
import { authService } from '@/services/auth';
import { useAppleCredentialWatch } from '@/hooks/useAppleCredentialWatch';
import { initBackgroundVideoUploadManager } from '@/services/backgroundVideoUploadManager';
import { initSentry } from '@/utilities/sentry';
import { isVersionBelowMinimum } from '@/utilities/versionCheck';
import { F } from '@/utilities/constants';
import type { UserRole } from '@/types';

// Must run before the provider tree renders — this is what wires up global JS
// exception / unhandled-promise-rejection capture for the whole app.
initSentry();

// Registered once per app process, before any screen mounts — a video upload
// left mid-transfer by a killed app has no live screen to resume it, so the
// listener + boot-time reconciliation must not depend on one being mounted.
initBackgroundVideoUploadManager();

// Rendered by Sentry.ErrorBoundary when a render error escapes the whole app
// tree. Deliberately styled with static color/spacing literals rather than
// useAppColors()/theme context — this boundary sits above every provider
// (AppThemeProvider + LanguageProvider included), so neither theme nor i18n
// context is guaranteed to be mounted when an error this high up fires. That
// is also why the copy is hardcoded bilingual (EN + NE) instead of going
// through t(). Values below are hand-picked to match this app's design tokens
// so the screen still looks native to Kolab in both light and dark mode.
const EF_LIGHT = {
  bg: '#FFFFFF',
  card: '#F1F5F9',
  cardBorder: '#E5E7F0',
  title: '#0F172A',
  body: '#475569',
  faint: '#94A3B8',
  iconBg: '#FEF3C7',
  icon: '#D97706',
  button: '#4F46E5',
  buttonPressed: '#3730A3',
};
const EF_DARK = {
  bg: '#0B1120',
  card: '#1E293B',
  cardBorder: '#334155',
  title: '#F1F5F9',
  body: '#CBD5E1',
  faint: '#64748B',
  iconBg: '#422006',
  icon: '#FBBF24',
  button: '#6366F1',
  buttonPressed: '#4F46E5',
};

function ErrorFallback({
  error,
  eventId,
  resetError,
}: {
  error?: unknown;
  eventId?: string | null;
  resetError: () => void;
}) {
  // useColorScheme() is a bare RN hook — it needs no provider, so it is safe to
  // read this high up in the tree.
  const scheme = useColorScheme();
  const c = scheme === 'dark' ? EF_DARK : EF_LIGHT;
  const [pressed, setPressed] = useState(false);

  const devMessage =
    __DEV__ && error instanceof Error ? error.message : null;

  return (
    <SafeAreaView style={[ef.safe, { backgroundColor: c.bg }]}>
      <ScrollView
        contentContainerStyle={ef.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={[ef.iconWrap, { backgroundColor: c.iconBg }]}>
          <FontAwesome5 name="exclamation" size={38} color={c.icon} solid />
        </View>

        <Text style={[ef.title, { color: c.title }]}>Something went wrong</Text>
        <Text style={[ef.titleNe, { color: c.body }]}>केही गडबड भयो</Text>

        <Text style={[ef.body, { color: c.body }]}>
          The app ran into an unexpected problem. Your information is safe.
          Tap “Try again” to reload — if it keeps happening, close the app fully
          and open it again.
        </Text>
        <Text style={[ef.bodyNe, { color: c.faint }]}>
          एपमा अनपेक्षित समस्या आयो। तपाईंको जानकारी सुरक्षित छ। पुनः लोड गर्न
          “पुनः प्रयास गर्नुहोस्” थिच्नुहोस्।
        </Text>

        <TouchableOpacity
          activeOpacity={0.9}
          onPressIn={() => setPressed(true)}
          onPressOut={() => setPressed(false)}
          onPress={resetError}
          accessibilityRole="button"
          accessibilityLabel="Try again"
          style={[
            ef.button,
            { backgroundColor: pressed ? c.buttonPressed : c.button },
          ]}
        >
          <FontAwesome5 name="redo" size={14} color="#FFFFFF" solid />
          <Text style={ef.buttonText}>Try again</Text>
        </TouchableOpacity>

        {eventId ? (
          <Text style={[ef.reference, { color: c.faint }]}>
            Reference code: {eventId}
          </Text>
        ) : null}

        {devMessage ? (
          <View style={[ef.devBox, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <Text style={[ef.devLabel, { color: c.faint }]}>DEV — error detail</Text>
            <Text style={[ef.devText, { color: c.body }]}>{devMessage}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const ef = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 48,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontFamily: F.bold,
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 4,
  },
  titleNe: {
    fontFamily: F.medium,
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 16,
  },
  body: {
    fontFamily: F.regular,
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    maxWidth: 340,
  },
  bodyNe: {
    fontFamily: F.regular,
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 10,
    maxWidth: 340,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 32,
    paddingVertical: 15,
    paddingHorizontal: 36,
    borderRadius: 14,
    minWidth: 200,
  },
  buttonText: { color: '#FFFFFF', fontFamily: F.semibold, fontSize: 15 },
  reference: {
    fontFamily: F.regular,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
  },
  devBox: {
    marginTop: 24,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'stretch',
  },
  devLabel: {
    fontFamily: F.semibold,
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 6,
  },
  devText: { fontFamily: F.regular, fontSize: 12, lineHeight: 18 },
});

// Handles auth-based redirects for both login AND logout
function RootNavigator() {
  const { user, isLoading, updateUser } = useAuth();
  const { flags } = usePlatformFlags();
  const segments = useSegments();
  const router = useRouter();
  const C = useAppColors();

  // Reacts if the user revokes Sign in with Apple from iOS Settings.
  useAppleCredentialWatch();

  function onboardingEnabledFor(role: UserRole): boolean {
    return role === 'CREATOR' ? flags.creatorOnboardingEnabled : flags.businessOnboardingEnabled;
  }

  // Persists the bypass (not just a one-render skip) so that if the admin
  // toggle is flipped back on later, an already-active user isn't suddenly
  // routed into onboarding on their next render.
  function skipOnboarding() {
    authService.completeOnboarding().catch(() => {});
    updateUser({ isFirstLogin: false });
  }
  // Snapshotted once when auth finishes loading (i.e. at cold start) rather than
  // read live on every render — otherwise flipping the Settings toggle ON mid-session
  // would immediately arm the gate and yank the user out of whatever screen they're
  // on, unmounting the whole Stack. The gate is meant to apply on the *next* cold
  // start, not retroactively during the current one.
  const [biometricGateArmed, setBiometricGateArmed] = useState(false);
  const [biometricUnlocked,  setBiometricUnlocked]  = useState(false);

  useEffect(() => {
    if (isLoading) return;
    // syncBiometricLoginWithDevice (not a bare isBiometricLoginEnabled read) so a
    // device whose face/fingerprint enrolment was removed since last launch drops
    // the preference here instead of arming a gate that can never be satisfied.
    void syncBiometricLoginWithDevice().then(setBiometricGateArmed);
  }, [isLoading]);

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup  = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding' || segments[0] === 'business-onboarding';
    const onAddEmail   = segments[0] === 'add-email';
    const isPublic     = segments[0] === 'legal';
    // The root index route (the doodle splash) resolves to zero path segments —
    // Expo Router's generated typed-segments union confirms 'index' never appears
    // as a literal segment value (the root path has no segments at all), but that
    // same generated union also claims segments.length can never be 0, which is
    // the actual runtime shape being checked for here — cast around the mismatch.
    const onSplash     = (segments as readonly string[]).length === 0;

    if (!user && !inAuthGroup && !isPublic && !onSplash) {
      // Logout (or a token-refresh failure) fired from somewhere deep in the
      // authenticated stack. A bare replace() swaps the current screen for
      // /login but leaves every authenticated screen below it in the history —
      // so /login shows a back button that pops the user straight back into a
      // now-unauthorised screen, which this same effect then bounces back to
      // /login (a second time, now with no back button). Tear the stack down to
      // its root first so /login becomes the only entry and shows no back arrow.
      try { if (router.canGoBack()) router.dismissAll(); } catch {}
      router.replace('/login');
    } else if (user && user.emailIsPlaceholder && !onAddEmail) {
      // Sign in with Apple returned no email (a repeat authorization) — the
      // account holds a placeholder address and can't proceed until the user
      // adds + verifies a real one. Takes precedence over onboarding/home.
      router.replace('/add-email');
    } else if (user && inAuthGroup) {
      if (user.isFirstLogin === true && onboardingEnabledFor(user.role)) {
        router.replace(user.role === 'CREATOR' ? '/onboarding' : '/business-onboarding');
      } else {
        if (user.isFirstLogin === true) skipOnboarding();
        router.replace(user.role === 'CREATOR' ? '/(creator)/' : '/(business)/');
      }
    } else if (user && user.isFirstLogin === true && !inOnboarding && !user.emailIsPlaceholder) {
      if (onboardingEnabledFor(user.role)) {
        router.replace(user.role === 'CREATOR' ? '/onboarding' : '/business-onboarding');
      } else {
        skipOnboarding();
        router.replace(user.role === 'CREATOR' ? '/(creator)/' : '/(business)/');
      }
    } else if (user && user.isFirstLogin !== true && onSplash) {
      // Landed on the splash screen (e.g. after the Stack remounted) while
      // already fully signed in — send them home instead of leaving them
      // stranded there. Only targets the splash specifically, not other valid
      // in-app screens like campaign-detail/submit-proposal/create-campaign.
      router.replace(user.role === 'CREATOR' ? '/(creator)/' : '/(business)/');
    }
    // biometricUnlocked is a dependency even though it isn't read above: flipping
    // it remounts <Stack> fresh onto the index route (see the gate below), and
    // without it here this effect wouldn't re-run to catch the "landed on splash
    // while signed in" branch — leaving the user stuck on the splash screen after
    // a successful biometric unlock.
  }, [user, isLoading, segments, flags.creatorOnboardingEnabled, flags.businessOnboardingEnabled, biometricUnlocked]);

  // Hard block on an outdated build — takes precedence over auth/biometric
  // state entirely (an outdated build talking to a since-changed API is worse
  // than one extra screen for an already-logged-in user). flags default to
  // empty-string minimums (no enforcement) until the real platform-flags
  // fetch resolves, so this can never false-block during that brief window.
  const minVersion = Platform.OS === 'ios' ? flags.minVersionIos : flags.minVersionAndroid;
  if (isVersionBelowMinimum(Application.nativeApplicationVersion, minVersion)) {
    return <ForceUpdateScreen />;
  }

  // Gate the whole app behind biometric unlock on cold start when the user has
  // it enabled — sits after the redirect effect above (so navigation state is
  // already settled) but before the Stack renders any real screen content.
  if (!isLoading && user && biometricGateArmed && !biometricUnlocked) {
    return <BiometricGateScreen onUnlock={() => setBiometricUnlocked(true)} />;
  }

  return (
    <>
      {/* contentStyle here matters as much as the individual screens' own
          backgrounds — expo-router mounts the incoming screen's native container
          (this contentStyle) a beat before that screen's own root View paints,
          and its default is transparent/white. Without a themed backgroundColor
          here, every push/pop shows a one-frame white flash between screens
          (worse in dark mode, where it reads as a visible blink). */}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="oauthredirect" />
        <Stack.Screen name="esewa-callback" />
        <Stack.Screen name="khalti-callback" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="add-email" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="business-onboarding" />
        <Stack.Screen name="(creator)" />
        <Stack.Screen name="(business)" />
        <Stack.Screen name="legal" options={{ presentation: 'card' }} />
        <Stack.Screen name="about-us" options={{ presentation: 'card' }} />
        <Stack.Screen name="campaign-detail" options={{ presentation: 'card' }} />
        <Stack.Screen name="submit-proposal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="create-campaign" options={{ presentation: 'modal' }} />
        <Stack.Screen name="edit-campaign" options={{ presentation: 'modal' }} />
        <Stack.Screen name="video-player" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
      </Stack>

      {/* Sits after the force-update and biometric-gate early returns above, so the
          one-shot enrolment offer can only ever appear over real app content —
          never stacked on top of a blocking screen. */}
      <BiometricEnrollPrompt />
    </>
  );
}

function RootLayoutInner() {
  const { isDark } = useIsDark();
  return (
    <PlatformSettingsProvider>
      <AuthProvider>
        <NotificationProvider>
          <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
            {/* Default status bar for plain-background screens — light-headered
                auth screens override this locally with their own <StatusBar style="light" />. */}
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <RootNavigator />
            <OfflineBanner />
            <GlobalUploadBanner />
          </ThemeProvider>
        </NotificationProvider>
      </AuthProvider>
    </PlatformSettingsProvider>
  );
}

function RootLayout() {
  // FontAwesome5.font is spread in here (rather than left to @expo/vector-icons'
  // own lazy per-icon Font.loadAsync) so every icon is already loaded before the
  // app's first paint — otherwise each icon renders blank until its style's font
  // finishes loading async, on whichever screen happens to use it first in a
  // session (this is what caused chat's composer icons to intermittently pop in
  // a beat after the message list, since it's the icons that were blank, not the
  // surrounding layout — the message text uses Poppins, already preloaded here).
  const [fontsLoaded] = useFonts({
    'Poppins-Regular':    Poppins_400Regular,
    'Poppins-Medium':     Poppins_500Medium,
    'Poppins-SemiBold':   Poppins_600SemiBold,
    'Poppins-Bold':       Poppins_700Bold,
    'Poppins-BoldItalic': Poppins_700Bold_Italic,
    'Poppins-ExtraBold':  Poppins_800ExtraBold,
    ...FontAwesome5.font,
  });

  if (!fontsLoaded) return null;

  return (
    <Sentry.ErrorBoundary
      fallback={({ error, eventId, resetError }) => (
        <ErrorFallback error={error} eventId={eventId} resetError={resetError} />
      )}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AppThemeProvider>
          <ToastProvider>
            <LanguageProvider>
              <View style={{ flex: 1 }}>
                <RootLayoutInner />
                <SplashScreen />
              </View>
            </LanguageProvider>
          </ToastProvider>
        </AppThemeProvider>
      </GestureHandlerRootView>
    </Sentry.ErrorBoundary>
  );
}

// Sentry.wrap adds touch-event breadcrumbs + a root profiler span around the
// whole app (the current Sentry Expo setup guide's recommended entry-point
// pattern) — separate from Sentry.ErrorBoundary above, which is what actually
// catches render errors and shows the fallback UI.
export default Sentry.wrap(RootLayout);
