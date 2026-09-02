import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
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
  comingSoon:                  false,
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
