// Contextual "log in to continue" sheet for signed-out visitors.
//
// Any screen a guest can reach calls `promptGuestAuth({ reason, intent })`
// when they tap an account-only action. The sheet explains why, records the
// screen to come back to (lib/pendingAuthIntent), and opens the existing
// login or signup flow. RootNavigator re-opens `intent` once signed in.
//
// Mounted once at the root (<GuestAuthPromptHost/>) — same module-level
// presenter pattern as UploadPreviewHost, so callers need no local state.
import { useEffect, useState } from 'react';
import { FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { setPendingAuthIntent, type PendingAuthIntent } from '@/lib/pendingAuthIntent';
import { F, FONT_SIZE, RADIUS, SPACING, lineHeightFor } from '@/utilities/constants';

export type GuestAuthReason = 'apply' | 'join' | 'message' | 'save' | 'report' | 'generic';

type PromptRequest = { reason: GuestAuthReason; intent?: PendingAuthIntent | null };

let present: ((req: PromptRequest) => void) | null = null;

export function promptGuestAuth(req: PromptRequest): void {
  present?.(req);
}

/** Open login / signup straight away (header + tab buttons) — clears any stale intent. */
export function openGuestLogin(): void {
  setPendingAuthIntent(null);
  router.push('/login');
}
export function openGuestSignup(role?: 'CREATOR' | 'BUSINESS'): void {
  setPendingAuthIntent(null);
  router.push(role ? { pathname: '/account-type', params: { role } } : '/account-type');
}

const ICONS: Record<GuestAuthReason, keyof typeof FontAwesome5.glyphMap> = {
  apply:   'paper-plane',
  join:    'trophy',
  message: 'comment-dots',
  save:    'bookmark',
  report:  'flag',
  generic: 'user-circle',
};

export function GuestAuthPromptHost() {
  const C = useAppColors();
  const { t } = useLanguage();
  const [req, setReq] = useState<PromptRequest | null>(null);

  useEffect(() => {
    present = setReq;
    return () => { if (present === setReq) present = null; };
  }, []);

  const reason = req?.reason ?? 'generic';
  const close = () => setReq(null);

  function go(target: 'login' | 'signup') {
    setPendingAuthIntent(req?.intent ?? null);
    setReq(null);
    // Let the sheet's Modal finish dismissing before pushing — pushing under
    // a still-visible Modal is flaky on iOS.
    setTimeout(() => {
      if (target === 'login') router.push('/login');
      else router.push('/account-type');
    }, 250);
  }

  return (
    <BottomSheet visible={!!req} onClose={close} dismissOnBackdropPress>
      <View style={styles.body}>
        <View style={[styles.iconWrap, { backgroundColor: C.accentLight }]}>
          <FontAwesome5 name={ICONS[reason]} solid size={22} color={C.accent} />
        </View>
        <Text style={[styles.title, { color: C.text }]}>{t(`guest.prompt.${reason}Title`)}</Text>
        <Text style={[styles.sub, { color: C.textSecondary }]}>{t(`guest.prompt.${reason}Body`)}</Text>
        <View style={styles.actions}>
          <Button label={t('guest.logIn')} onPress={() => go('login')} />
          <Button label={t('guest.createAccount')} variant="secondary" onPress={() => go('signup')} />
          <Button label={t('guest.prompt.notNow')} variant="ghost" size="medium" onPress={close} />
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body:     { alignItems: 'center', paddingTop: SPACING.sm, paddingBottom: SPACING.md },
  iconWrap: { width: 56, height: 56, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md },
  title:    { fontSize: FONT_SIZE.xl, fontFamily: F.bold, textAlign: 'center', lineHeight: lineHeightFor(FONT_SIZE.xl) },
  sub:      { fontSize: FONT_SIZE.md, fontFamily: F.regular, textAlign: 'center', marginTop: SPACING.xs, lineHeight: lineHeightFor(FONT_SIZE.md) },
  actions:  { alignSelf: 'stretch', gap: SPACING.sm, marginTop: SPACING.lg },
});
