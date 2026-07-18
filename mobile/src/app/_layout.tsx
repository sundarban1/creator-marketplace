import { DarkTheme, DefaultTheme, ThemeProvider, useRouter, useSegments } from 'expo-router';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
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
import { AppThemeProvider, useIsDark } from '@/context/ThemeContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { PlatformSettingsProvider, usePlatformFlags } from '@/context/PlatformSettingsContext';
import { SplashScreen } from '@/components/SplashScreen';
import { BiometricGateScreen } from '@/components/BiometricGateScreen';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ToastProvider } from '@/components/Toast';
import { isBiometricLoginEnabled } from '@/services/biometric';
import { authService } from '@/services/auth';
import type { UserRole } from '@/types';

// Handles auth-based redirects for both login AND logout
function RootNavigator() {
  const { user, isLoading, updateUser } = useAuth();
  const { flags } = usePlatformFlags();
  const segments = useSegments();
  const router = useRouter();

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
    setBiometricGateArmed(isBiometricLoginEnabled());
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

    if (!user && !inAuthGroup && !isPublic) {
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
  }, [user, isLoading, segments, flags.creatorOnboardingEnabled, flags.businessOnboardingEnabled]);

  // Gate the whole app behind biometric unlock on cold start when the user has
  // it enabled — sits after the redirect effect above (so navigation state is
  // already settled) but before the Stack renders any real screen content.
  if (!isLoading && user && biometricGateArmed && !biometricUnlocked) {
    return <BiometricGateScreen onUnlock={() => setBiometricUnlocked(true)} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="business-onboarding" />
      <Stack.Screen name="(creator)" />
      <Stack.Screen name="(business)" />
      <Stack.Screen name="legal" options={{ presentation: 'card' }} />
      <Stack.Screen name="campaign-detail" options={{ presentation: 'card' }} />
      <Stack.Screen name="submit-proposal" options={{ presentation: 'modal' }} />
      <Stack.Screen name="create-campaign" options={{ presentation: 'modal' }} />
      <Stack.Screen name="video-player" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
    </Stack>
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
          </ThemeProvider>
        </NotificationProvider>
      </AuthProvider>
    </PlatformSettingsProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Poppins-Regular':    Poppins_400Regular,
    'Poppins-Medium':     Poppins_500Medium,
    'Poppins-SemiBold':   Poppins_600SemiBold,
    'Poppins-Bold':       Poppins_700Bold,
    'Poppins-BoldItalic': Poppins_700Bold_Italic,
    'Poppins-ExtraBold':  Poppins_800ExtraBold,
  });

  if (!fontsLoaded) return null;

  return (
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
  );
}
