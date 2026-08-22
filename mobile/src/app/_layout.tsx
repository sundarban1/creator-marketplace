import * as Sentry from '@sentry/react-native';
import { DarkTheme, DefaultTheme, ThemeProvider, useRouter, useSegments } from 'expo-router';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Application from 'expo-application';
import { FontAwesome5 } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
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
import { initBackgroundVideoUploadManager } from '@/services/backgroundVideoUploadManager';
import { initSentry } from '@/utilities/sentry';
import { isVersionBelowMinimum } from '@/utilities/versionCheck';
import { COLORS, F, SPACING, FONT_SIZE, RADIUS } from '@/utilities/constants';
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
// (AppThemeProvider included), so theme context may not be mounted when an
// error this high up fires. Values below are hand-picked to match this app's
// COLORS/F/SPACING tokens so it still looks native to the app.
function ErrorFallback({ resetError }: { resetError: () => void }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING.xl,
        backgroundColor: COLORS.background,
      }}
    >
      <Text
        style={{
          fontFamily: F.semibold,
          fontSize: FONT_SIZE.xl,
          color: COLORS.text,
          textAlign: 'center',
          marginBottom: SPACING.sm,
        }}
      >
        Something went wrong
      </Text>
      <Text
        style={{
          fontFamily: F.regular,
          fontSize: FONT_SIZE.md,
          color: COLORS.textSecondary,
          textAlign: 'center',
          marginBottom: SPACING.xl,
        }}
      >
        The app hit an unexpected error. Please try again.
      </Text>
      <TouchableOpacity
        onPress={resetError}
        style={{
          backgroundColor: COLORS.brinjal1,
          paddingVertical: SPACING.md,
          paddingHorizontal: SPACING.xxl,
          borderRadius: RADIUS.md,
        }}
      >
        <Text style={{ fontFamily: F.semibold, fontSize: FONT_SIZE.md, color: '#FFFFFF' }}>
          Try Again
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// Handles auth-based redirects for both login AND logout
function RootNavigator() {
  const { user, isLoading, updateUser } = useAuth();
  const { flags } = usePlatformFlags();
  const segments = useSegments();
  const router = useRouter();
  const C = useAppColors();

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
    const isPublic     = segments[0] === 'legal';
    // The root index route (the doodle splash) resolves to zero path segments —
    // Expo Router's generated typed-segments union confirms 'index' never appears
    // as a literal segment value (the root path has no segments at all), but that
    // same generated union also claims segments.length can never be 0, which is
    // the actual runtime shape being checked for here — cast around the mismatch.
    const onSplash     = (segments as readonly string[]).length === 0;

    if (!user && !inAuthGroup && !isPublic && !onSplash) {
      router.replace('/login');
    } else if (user && inAuthGroup) {
      if (user.isFirstLogin === true && onboardingEnabledFor(user.role)) {
        router.replace(user.role === 'CREATOR' ? '/onboarding' : '/business-onboarding');
      } else {
        if (user.isFirstLogin === true) skipOnboarding();
        router.replace(user.role === 'CREATOR' ? '/(creator)/' : '/(business)/');
      }
    } else if (user && user.isFirstLogin === true && !inOnboarding) {
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
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="business-onboarding" />
        <Stack.Screen name="(creator)" />
        <Stack.Screen name="(business)" />
        <Stack.Screen name="legal" options={{ presentation: 'card' }} />
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
    <Sentry.ErrorBoundary fallback={({ resetError }) => <ErrorFallback resetError={resetError} />}>
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
