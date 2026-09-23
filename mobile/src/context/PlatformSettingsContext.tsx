import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { platformSettingsService, type PlatformFlags } from '@/services/platformSettings';

// Fails open — a network hiccup should never block signup/onboarding/chat.
const DEFAULT_FLAGS: PlatformFlags = {
  businessRegistrationEnabled: true,
  creatorRegistrationEnabled:  true,
  businessOnboardingEnabled:   true,
  creatorOnboardingEnabled:    true,
  messagingEnabled:            true,
  platformCommission:          0,
  paymentFeePercent:           5,
  paymentTaxPercent:           13,
  comingSoonIos:               false,
  comingSoonAndroid:           false,
  comingSoon:                  false,
  socialAccountsTiktokEnabled:    true,
  socialAccountsFacebookEnabled:  true,
  socialAccountsInstagramEnabled: true,
  socialAccountsYoutubeEnabled:   true,
  minVersionIos:               '',
  minVersionAndroid:           '',
};

type PlatformSettingsContextValue = {
  flags: PlatformFlags;
  isLoading: boolean;
  // Most flags only need the once-at-launch fetch below, but admin-edited
  // money fields (paymentFeePercent/paymentTaxPercent) are worth re-pulling
  // whenever a screen that displays them regains focus, so a running app
  // reflects a settings change without needing a full reload.
  refetch: () => Promise<void>;
};

const PlatformSettingsContext = createContext<PlatformSettingsContextValue | null>(null);

export function PlatformSettingsProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<PlatformFlags>(DEFAULT_FLAGS);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = async () => {
    try {
      setFlags(await platformSettingsService.getFlags());
    } catch { /* keep whatever flags are already loaded */ }
  };

  useEffect(() => {
    refetch().finally(() => setIsLoading(false));
    // Also re-pull on every foreground resume (not just cold start), so an
    // admin change — the min-app-version force-update gate especially —
    // reaches an already-logged-in user without them needing to fully
    // relaunch. Individual screens can still call `refetch()` themselves
    // (e.g. on nav focus) for freshness that can't wait for a backgrounding.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refetch();
    });
    return () => sub.remove();
  }, []);

  return (
    <PlatformSettingsContext.Provider value={{ flags, isLoading, refetch }}>
      {children}
    </PlatformSettingsContext.Provider>
  );
}

export function usePlatformFlags(): PlatformSettingsContextValue {
  const ctx = useContext(PlatformSettingsContext);
  if (!ctx) throw new Error('usePlatformFlags must be used within a PlatformSettingsProvider');
  return ctx;
}
