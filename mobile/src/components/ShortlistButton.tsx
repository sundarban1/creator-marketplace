import { FontAwesome5 } from '@expo/vector-icons';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useShortlistedCampaigns } from '@/hooks/useShortlistedCampaigns';
import { useToast } from '@/components/Toast';
import { RADIUS } from '@/utilities/constants';

// Bookmark toggle a creator taps to keep an event for later. Sits beside the
// Apply CTA everywhere it appears (card + detail), so it reads as "save this
// instead of applying right now".
//
// Nothing renders for a business/client session: the shortlist is a
// creator-only endpoint, and the button would 403 on tap.
export function ShortlistButton({ campaignId, size = 'md', style }: {
  campaignId: string;
  size?: 'xs' | 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
}) {
  const C = useAppColors();
  const { user } = useAuth();
  const { t } = useLanguage();
  const toast = useToast();
  const { isShortlisted, toggle } = useShortlistedCampaigns();

  const saved = isShortlisted(campaignId);
  // 32 fits inside CampaignListItem's compact detail line, 38 matches
  // CampaignCard's Apply button height exactly, and 44 is the standard
  // standalone touch target used in the detail screen's CTA bar. The two
  // smaller sizes lean on the hitSlop below to stay tappable.
  const box   = size === 'xs' ? 32 : size === 'sm' ? 38 : 44;
  const icon  = size === 'xs' ? 13 : size === 'sm' ? 15 : 17;

  async function handlePress() {
    try {
      const nowSaved = await toggle(campaignId);
      toast.success(nowSaved ? t('campaignCard.shortlistAdded') : t('campaignCard.shortlistRemoved'));
    } catch {
      toast.error(t('campaignCard.shortlistFailed'));
    }
  }

  if (user?.role !== 'CREATOR') return null;

  return (
    <Pressable
      // On a card this sits inside the card-wide Pressable that opens the
      // detail screen. RN's responder system already gives the inner press
      // priority; stopPropagation keeps that true if the parent ever switches
      // to a Touchable that does bubble.
      onPress={(e) => { e.stopPropagation(); void handlePress(); }}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityState={{ selected: saved }}
      accessibilityLabel={saved ? t('campaignCard.shortlistRemoveA11y') : t('campaignCard.shortlistAddA11y')}
      style={({ pressed }) => [
        styles.btn,
        { width: box, height: box, borderColor: saved ? C.brinjal1 : C.border, backgroundColor: saved ? C.primaryLight : C.surface },
        pressed && { opacity: 0.7 },
        style,
      ]}>
      <FontAwesome5 name="bookmark" solid={saved} size={icon} color={saved ? C.brinjal1 : C.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.md, borderWidth: 1.5, flexShrink: 0 },
});
