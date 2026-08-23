import { FontAwesome5 } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import type { ProviderType } from '@/services/creator';
import { F, RADIUS, lineHeightFor } from '@/utilities/constants';

// §9 — "a client needs to know who they are actually hiring". Rendered next to
// a provider's name on their profile and on discovery cards. `type` is null for
// accounts onboarded before the question existed; the badge renders nothing
// rather than assuming INDIVIDUAL.
// Keyed by the raw string the API returns, not by ProviderType: the picker no
// longer offers AGENCY, but profiles created before it was withdrawn still come
// back as 'AGENCY' (the Prisma enum and creator.dto still carry it), so a
// Record<ProviderType, _> lookup returned undefined and crashed the People tab.
// Unknown values render nothing, same as a null type.
const META: Record<string, { icon: string; labelKey: string } | undefined> = {
  INDIVIDUAL: { icon: 'user',     labelKey: 'providerType.individual' },
  TEAM:       { icon: 'users',    labelKey: 'providerType.team' },
  AGENCY:     { icon: 'building', labelKey: 'providerType.agency' },
};

export function ProviderTypeBadge({ type, teamSize, size = 'md' }: {
  /** Widened past ProviderType because the API can still return a withdrawn
   *  value (e.g. 'AGENCY') for an account created before the picker changed. */
  type: ProviderType | (string & {}) | null | undefined;
  /** Appended as the spec's "Team · 4 members" line. Ignored for non-TEAM types. */
  teamSize?: number | null;
  size?: 'sm' | 'md';
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  if (!type) return null;

  const meta = META[type];
  if (!meta) return null;

  const fontSize = size === 'sm' ? 10 : 12;
  // The card badge sits on a one-line name row, so it drops the "members" word
  // the roomier profile badge keeps.
  const label = type === 'TEAM' && teamSize
    ? (size === 'sm' ? `${t(meta.labelKey)} · ${teamSize}` : t('providerType.teamMembers', { n: teamSize }))
    : t(meta.labelKey);

  return (
    <View style={[s.badge, { backgroundColor: C.primaryLight }, size === 'sm' && s.badgeSm]}>
      <FontAwesome5 name={meta.icon as never} solid size={size === 'sm' ? 8 : 10} color={C.brinjal1} />
      <Text style={[s.label, { color: C.brinjal1, fontSize, lineHeight: lineHeightFor(fontSize) }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  badgeSm: { paddingHorizontal: 6, paddingVertical: 2, gap: 3 },
  label:   { fontFamily: F.semibold, includeFontPadding: false },
});
