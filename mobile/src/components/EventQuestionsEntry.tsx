import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { F, RADIUS, SPACING } from '@/utilities/constants';

// Entry point into the shared free-event Q&A page ("Ask Organizer"). Shown to
// an accepted creator and to the owning business — a free event never opens a
// chat, so this is the one channel for logistics questions. See
// src/app/event-questions.tsx.
//
// `celebrate` adds a "Congrats, You're Invited!" banner on top — used where
// this card is the accepted creator's main confirmation (the event-details
// footer), so acceptance and "ask the organizer" live in one place.
export function EventQuestionsEntry({
  campaignId,
  campaignTitle,
  variant,
  celebrate = false,
  style,
}: {
  campaignId: string;
  campaignTitle?: string;
  variant: 'creator' | 'business';
  celebrate?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const C = useAppColors();
  const { t } = useLanguage();

  return (
    <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }, style]}>
      {celebrate && (
        <View style={s.congrats}>
          <View style={s.congratsIcon}>
            <FontAwesome5 name="trophy" solid size={15} color="#16A34A" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.congratsTitle}>{t('eventQuestions.invitedTitle')}</Text>
            <Text style={s.congratsSub}>{t('eventQuestions.invitedSub')}</Text>
          </View>
        </View>
      )}

      <View style={s.row}>
        <View style={[s.iconWrap, { backgroundColor: C.primaryLight }]}>
          <FontAwesome5 name="comments" solid size={15} color={C.brinjal1} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.title, { color: C.text }]}>{t('eventQuestions.subtitlePrompt')}</Text>
          <Text style={[s.body, { color: C.textSecondary }]}>
            {variant === 'business' ? t('eventQuestions.entryBodyBusiness') : t('eventQuestions.entryBodyCreator')}
          </Text>
        </View>
      </View>

      <Pressable
        style={[s.btn, { backgroundColor: C.brinjal1 }]}
        onPress={() => router.push({ pathname: '/event-questions', params: { campaignId, campaignTitle: campaignTitle ?? '' } })}>
        <FontAwesome5 name={variant === 'business' ? 'inbox' : 'paper-plane'} solid size={13} color="#fff" />
        <Text style={s.btnTxt}>
          {variant === 'business' ? t('eventQuestions.viewQuestions') : t('eventQuestions.askOrganizer')}
        </Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  card:     { borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.lg, gap: SPACING.md },

  congrats:      { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#6EE7B7', borderRadius: RADIUS.md, padding: SPACING.md },
  congratsIcon:  { width: 34, height: 34, borderRadius: RADIUS.full, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  congratsTitle: { fontSize: 14, fontFamily: F.bold, color: '#065F46' },
  congratsSub:   { fontSize: 12, fontFamily: F.regular, color: '#047857', lineHeight: 17, marginTop: 1 },

  row:      { flexDirection: 'row', gap: SPACING.md, alignItems: 'flex-start' },
  iconWrap: { width: 34, height: 34, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center' },
  title:    { fontSize: 15, fontFamily: F.bold, marginBottom: 3 },
  body:     { fontSize: 12.5, fontFamily: F.regular, lineHeight: 18 },
  btn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: RADIUS.md, paddingVertical: 12 },
  btnTxt:   { fontSize: 14, fontFamily: F.bold, color: '#fff' },
});
