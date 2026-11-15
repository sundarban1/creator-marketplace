import { Redirect } from 'expo-router';

// Placeholder behind the guest bar's "Log In" tab. The tab press is
// intercepted (see (guest)/_layout.tsx) and opens /login instead, so this only
// renders if something navigates here directly — send that to login too.
export default function GuestSignInTab() {
  return <Redirect href="/login" />;
}
