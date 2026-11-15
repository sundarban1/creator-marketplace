import { View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';

// Root route — a pass-through only. RootNavigator (src/app/_layout.tsx) owns
// every redirect from here: a signed-out visitor goes to the Guest navigation
// ((guest)/ — browse first, no forced login), a signed-in user to their
// creator / business home or onboarding. The branded SplashScreen overlay
// covers this blank frame on cold start.
//
// This used to be a standalone "Welcome" screen with Get Started / Log in.
// Guest home's header and CTAs (Log In, Create Account) replace it.
export default function RootIndex() {
  const C = useAppColors();
  return <View style={{ flex: 1, backgroundColor: C.background }} />;
}
