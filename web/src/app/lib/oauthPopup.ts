export interface OAuthPopupResult {
  success: boolean;
  error?: string;
}

/**
 * Opens `url` in a centered popup and waits for OAuthCallbackPage (rendered
 * inside that popup once the provider redirects back through our backend) to
 * postMessage the connect result, or for the user to close the popup without
 * finishing — treated as a cancel. Used for TikTok; Google/Facebook resolve
 * their own popups in-page via their JS SDKs and never need this.
 */
export function openOAuthPopup(url: string, platform: string): Promise<OAuthPopupResult> {
  const width = 520;
  const height = 680;
  const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
  const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);
  const popup = window.open(url, 'kolab-oauth', `width=${width},height=${height},left=${left},top=${top}`);

  return new Promise<OAuthPopupResult>((resolve) => {
    if (!popup) {
      resolve({ success: false, error: 'Could not open the connect window — check your popup blocker.' });
      return;
    }

    let settled = false;
    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      clearInterval(pollClosed);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { source?: string; platform?: string; success?: boolean; error?: string } | null;
      if (data?.source !== 'kolab-oauth' || data.platform !== platform) return;
      settled = true;
      cleanup();
      resolve({ success: !!data.success, error: data.error });
    };
    window.addEventListener('message', onMessage);

    const pollClosed = window.setInterval(() => {
      if (!popup.closed || settled) return;
      cleanup();
      resolve({ success: false, error: 'Connection cancelled.' });
    }, 500);
  });
}
