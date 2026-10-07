import { useRef, useState, type ReactNode } from 'react';
import { FontAwesome5 } from '@expo/vector-icons';
import { ActivityIndicator, Linking, Platform, Pressable, Share, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { BottomSheet } from '@/components/BottomSheet';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/context/AuthContext';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { opportunityShareService, type SharePlatform } from '@/services/opportunityShare';
import { F, RADIUS } from '@/utilities/constants';

// Share Opportunity — a creator passing an event/campaign to other creators
// over WhatsApp, SMS, a copied link or the system share sheet. "I found an
// opportunity you might like" — not a referral: no code, no reward.
//
// Same creator-only contract as ShortlistButton (renders nothing for a
// business session) and the same size scale, so the two sit side by side.

// expo-clipboard is a native module — a dev client built before it was added
// throws on import, so load it lazily and fall back to the share sheet.
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Clipboard = require('expo-clipboard') as typeof import('expo-clipboard');
    await Clipboard.setStringAsync(text);
    return true;
  } catch {
    return false;
  }
}

export function ShareOpportunityButton({ campaignId, size = 'md', variant = 'icon', style }: {
  campaignId: string;
  size?: 'xs' | 'sm' | 'md';
  /** `icon` = bordered square (cards, header); `button` = full-width secondary button (detail CTA bar). */
  variant?: 'icon' | 'button';
  style?: StyleProp<ViewStyle>;
}) {
  const C = useAppColors();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  if (user?.role !== 'CREATOR') return null;

  const box  = size === 'xs' ? 32 : size === 'sm' ? 38 : 44;
  const icon = size === 'xs' ? 13 : size === 'sm' ? 15 : 17;

  return (
    <>
      {variant === 'button' ? (
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t('shareOpportunity.a11y')}
          style={({ pressed }) => [styles.wideBtn, { borderColor: C.border, backgroundColor: C.surface }, pressed && { opacity: 0.7 }, style]}>
          <FontAwesome5 name="share-alt" size={14} color={C.text} />
          <Text style={[styles.wideBtnTxt, { color: C.text }]}>{t('shareOpportunity.button')}</Text>
        </Pressable>
      ) : (
        <Pressable
          // Inside a card-wide Pressable — keep the tap from opening the detail screen.
          onPress={(e) => { e.stopPropagation(); setOpen(true); }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('shareOpportunity.a11y')}
          style={({ pressed }) => [
            styles.iconBtn,
            { width: box, height: box, borderColor: C.border, backgroundColor: C.surface },
            pressed && { opacity: 0.7 },
            style,
          ]}>
          <FontAwesome5 name="share-alt" size={icon} color={C.textSecondary} />
        </Pressable>
      )}

      {open && <ShareOpportunitySheet campaignId={campaignId} onClose={() => setOpen(false)} />}
    </>
  );
}

function ShareOpportunitySheet({ campaignId, onClose }: { campaignId: string; onClose: () => void }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const toast = useToast();
  const links = useRef(new Map<SharePlatform, Promise<string>>());
  const [busy, setBusy] = useState<SharePlatform | null>(null);

  // Minted lazily per platform (the backend reuses one link per creator ×
  // opportunity × platform), cached for the life of the sheet.
  function linkFor(platform: SharePlatform): Promise<string> {
    let p = links.current.get(platform);
    if (!p) {
      p = opportunityShareService.create(campaignId, platform).then((r) => r.shareUrl);
      p.catch(() => links.current.delete(platform));
      links.current.set(platform, p);
    }
    return p;
  }

  const message = (link: string) => t('shareOpportunity.message', { link });

  async function run(platform: SharePlatform, action: () => Promise<void>) {
    if (busy) return;
    setBusy(platform);
    try {
      await action();
    } catch {
      toast.error(t('shareOpportunity.failed'));
    } finally {
      setBusy(null);
    }
  }

  const shareWhatsApp = () => run('WHATSAPP', async () => {
    const text = encodeURIComponent(message(await linkFor('WHATSAPP')));
    try {
      await Linking.openURL(`whatsapp://send?text=${text}`);
      onClose();
    } catch {
      // App not installed — wa.me opens WhatsApp Web / the store page instead.
      try {
        await Linking.openURL(`https://wa.me/?text=${text}`);
        onClose();
      } catch {
        toast.error(t('shareOpportunity.whatsappMissing'));
      }
    }
  });

  const shareSms = () => run('SMS', async () => {
    const body = encodeURIComponent(message(await linkFor('SMS')));
    // iOS Messages wants `sms:&body=`, Android `sms:?body=`.
    await Linking.openURL(Platform.OS === 'ios' ? `sms:&body=${body}` : `sms:?body=${body}`);
    onClose();
  });

  const copyLink = () => run('COPY_LINK', async () => {
    const link = await linkFor('COPY_LINK');
    if (await copyToClipboard(link)) {
      toast.success(t('shareOpportunity.linkCopied'));
      onClose();
    } else {
      // No clipboard module in this build — the system sheet has its own "Copy".
      await Share.share({ message: link });
    }
  });

  const nativeShare = () => run('NATIVE_SHARE', async () => {
    const link = await linkFor('NATIVE_SHARE');
    await Share.share(Platform.OS === 'ios' ? { message: message(link), url: link } : { message: message(link) });
  });

  return (
    <BottomSheet visible onClose={onClose} title={t('shareOpportunity.title')}>
      <Text style={[styles.desc, { color: C.textSecondary }]}>{t('shareOpportunity.description')}</Text>
      <View style={styles.grid}>
        <ShareTile label={t('shareOpportunity.whatsapp')} loading={busy === 'WHATSAPP'} onPress={shareWhatsApp}
          icon={<FontAwesome5 name="whatsapp" size={22} color="#25D366" />} tint="rgba(37,211,102,0.12)" />
        <ShareTile label={t('shareOpportunity.sms')} loading={busy === 'SMS'} onPress={shareSms}
          icon={<FontAwesome5 name="sms" size={20} color={C.brinjal1} />} tint={C.primaryLight} />
        <ShareTile label={t('shareOpportunity.copyLink')} loading={busy === 'COPY_LINK'} onPress={copyLink}
          icon={<FontAwesome5 name="link" size={18} color={C.text} />} tint={C.background} />
        <ShareTile label={t('shareOpportunity.more')} loading={busy === 'NATIVE_SHARE'} onPress={nativeShare}
          icon={<FontAwesome5 name="share-alt" size={18} color={C.text} />} tint={C.background} />
      </View>
    </BottomSheet>
  );
}

function ShareTile({ label, icon, tint, loading, onPress }: {
  label: string; icon: ReactNode; tint: string; loading: boolean; onPress: () => void;
}) {
  const C = useAppColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.tile, pressed && { opacity: 0.7 }]}>
      <View style={[styles.tileIcon, { backgroundColor: tint, borderColor: C.border }]}>
        {loading ? <ActivityIndicator size="small" color={C.textSecondary} /> : icon}
      </View>
      <Text style={[styles.tileLabel, { color: C.text }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  iconBtn: { alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.md, borderWidth: 1.5, flexShrink: 0 },
  wideBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    minHeight: 44, borderRadius: RADIUS.md, borderWidth: 1.5, paddingHorizontal: 16,
  },
  wideBtnTxt: { fontSize: 14, fontFamily: F.semibold },

  desc: { fontSize: 14, lineHeight: 21, fontFamily: F.regular, marginBottom: 18 },
  grid: { flexDirection: 'row', justifyContent: 'space-between' },
  tile: { alignItems: 'center', gap: 8, width: '23%', minHeight: 44 },
  tileIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  tileLabel: { fontSize: 12, fontFamily: F.semibold },
});
