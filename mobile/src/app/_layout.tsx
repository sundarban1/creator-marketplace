import { DarkTheme, DefaultTheme, ThemeProvider, useRouter, useSegments } from 'expo-router';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
} from '@expo-google-fonts/poppins';
import { AuthProvider } from '@/context/AuthContext';
import { useAuth } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { AppThemeProvider, useIsDark } from '@/context/ThemeContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { SplashScreen } from '@/components/SplashScreen';
import { ToastProvider } from '@/components/Toast';

// Handles auth-based redirects for both login AND logout
function RootNavigator() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup  = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding' || segments[0] === 'business-onboarding';
    const isPublic     = segments[0] === 'legal';

    if (!user && !inAuthGroup && !isPublic) {
      router.replace('/login');
    } else if (user && inAuthGroup) {
      if (user.isFirstLogin === true) {
        router.replace(user.role === 'CREATOR' ? '/onboarding' : '/business-onboarding');
      } else {
        router.replace(user.role === 'CREATOR' ? '/(creator)/' : '/(business)/');
      }
    } else if (user && user.isFirstLogin === true && !inOnboarding) {
      router.replace(user.role === 'CREATOR' ? '/onboarding' : '/business-onboarding');
    }
  }, [user, isLoading, segments]);

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
    </Stack>
  );
}

function RootLayoutInner() {
  const { isDark } = useIsDark();
  return (
    <LanguageProvider>
      <AuthProvider>
        <NotificationProvider>
          <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
            <RootNavigator />
          </ThemeProvider>
        </NotificationProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Poppins-Regular':   Poppins_400Regular,
    'Poppins-Medium':    Poppins_500Medium,
    'Poppins-SemiBold':  Poppins_600SemiBold,
    'Poppins-Bold':      Poppins_700Bold,
    'Poppins-ExtraBold': Poppins_800ExtraBold,
  });

  if (!fontsLoaded) return null;

  return (
    <AppThemeProvider>
      <ToastProvider>
        <View style={{ flex: 1 }}>
          <RootLayoutInner />
          <SplashScreen />
        </View>
      </ToastProvider>
    </AppThemeProvider>
  );
}
