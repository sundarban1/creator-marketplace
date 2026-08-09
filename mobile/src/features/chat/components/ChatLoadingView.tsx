import { FontAwesome5 } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { F, RADIUS } from '@/utilities/constants';

// Fills the space below the header (message list + composer) while a chat
// screen's first load is in flight — keeps that area from painting the
// list, then the composer, as separate commits a beat apart.
export function ChatLoadingView() {
  const C = useAppColors();
  const { t } = useLanguage();
  return (
    <View style={[s.wrap, { backgroundColor: C.background }]}>
      <View style={[s.icon, { backgroundColor: C.primaryLight }]}>
        <FontAwesome5 name="comment-alt" size={30} color={C.brinjal1} />
      </View>
      <ActivityIndicator size="small" color={C.brinjal1} />
      <Text style={[s.text, { color: C.textSecondary }]}>{t('messages.loadingConversation')}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  icon: { width: 64, height: 64, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 13, fontFamily: F.medium },
});
