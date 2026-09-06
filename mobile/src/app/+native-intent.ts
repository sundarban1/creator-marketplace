// Intercepts incoming deep-link URLs before Expo Router turns them into navigation.
//
// expo-auth-session's Google/Facebook OAuth flow redirects back into the app with a
// provider-specific URL:
//   Google   — `…:/oauthredirect?code=…`  (Android: `com.sundarban.kolab:/oauthredirect`)
//   Facebook — `fb<appId>://authorize#access_token=…`
// expo-web-browser resolves the pending `promptAsync()` promise from that URL via its own
// Linking listener. If Expo Router *also* handles the URL it navigates away (to the
// `oauthredirect` Stack screen, or an unmatched route), which unmounts the (auth) login
// screen that owns the in-flight auth request — so the token exchange + backend sign-in
// never finish and the user lands back on /login. iOS never hits this because
// ASWebAuthenticationSession returns the redirect inline with no Linking event. Returning a
// falsy value here tells Expo Router to stay on the current path.
//
// esewa-callback / khalti-callback deliberately do NOT match — those routes own their own
// post-redirect UX and need the navigation.
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string | null {
  try {
    if (/[:/]oauthredirect(?:[/?#]|$)/i.test(path)) return null;
    if (/^fb\d+:\/\/authorize(?:[/?#]|$)/i.test(path)) return null;
  } catch {
    // never throw from here — a throw can crash app launch
  }
  return path;
}
