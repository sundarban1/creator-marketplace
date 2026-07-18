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
  comingSoon:                  false,
};

type PlatformSettingsContextValue = {
  flags: PlatformFlags;
  isLoading: boolean;
};

const PlatformSettingsContext = createContext<PlatformSettingsContextValue | null>(null);

export function PlatformSettingsProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<PlatformFlags>(DEFAULT_FLAGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    platformSettingsService.getFlags()
      .then(setFlags)
      .catch(() => { /* fail open with DEFAULT_FLAGS */ })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <PlatformSettingsContext.Provider value={{ flags, isLoading }}>
      {children}
    </PlatformSettingsContext.Provider>
  );
}

export function usePlatformFlags(): PlatformSettingsContextValue {
  const ctx = useContext(PlatformSettingsContext);
  if (!ctx) throw new Error('usePlatformFlags must be used within a PlatformSettingsProvider');
  return ctx;
}
