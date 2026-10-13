import { createContext, useContext, useState, type ReactNode } from 'react';
import { BottomSheet } from '@/components/BottomSheet';
import { SupportChannels } from '@/components/SupportChannels';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { MAX_CONTENT_WIDTH } from '@/utilities/constants';
import { getSupportContext } from '@/utilities/supportContact';

type Topic = 'payment' | 'campaign';

type SupportContactValue = {
  /** Open the Contact Support sheet; `topic` tailors the prefilled message. */
  openSupport: (topic?: Topic) => void;
};

const SupportContactContext = createContext<SupportContactValue>({ openSupport: () => {} });

/**
 * One app-wide Contact Support sheet (WhatsApp → phone → email), so any
 * screen — the drawers, settings, login — opens the same thing with
 * `useSupportContact().openSupport()` instead of each mounting its own.
 * A sheet rather than a floating button: on native the corner is already
 * taken by tab bars, FABs and chat composers.
 */
export function SupportContactProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [topic, setTopic] = useState<Topic | undefined>(undefined);

  // Signed-in users only — a stray call from a pre-login screen is a no-op.
  const openSupport = (next?: Topic) => {
    if (!user) return;
    setTopic(next);
    setVisible(true);
  };

  return (
    <SupportContactContext.Provider value={{ openSupport }}>
      {children}
      <BottomSheet
        visible={visible && !!user}
        onClose={() => setVisible(false)}
        title={t('supportContact.title')}
        subtitle={t('supportContact.intro')}
        maxWidth={MAX_CONTENT_WIDTH}
        closeOnScrollDown>
        {visible && <SupportChannels context={getSupportContext(user?.role, topic)} />}
      </BottomSheet>
    </SupportContactContext.Provider>
  );
}

export function useSupportContact(): SupportContactValue {
  return useContext(SupportContactContext);
}
