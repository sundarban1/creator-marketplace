import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useAppColors } from '@/context/ThemeContext';
import { authenticate, getBiometricLabel, type BiometricLabel } from '@/services/biometric';
import { F } from '@/utilities/constants';

type Props = { onUnlock: () => void };

// Shown on cold start when the user has "Enable Face ID / Fingerprint login" on in
// Settings. Biometric is a convenience shortcut, never a hard lock — failing or
// cancelling it always leaves "Use password instead" (a real logout) as an escape hatch.
export function BiometricGateScreen({ onUnlock }: Props) {
  const { user, logout } = useAuth();
  const C = useAppColors();
  const [label, setLabel] = useState<BiometricLabel>('Biometrics');
  const [checking, setChecking] = useState(false);
  const [failed, setFailed] = useState(false);

  async function tryUnlock() {
    setChecking(true);
    setFailed(false);
    const ok = await authenticate(`Unlock kolab${user?.name ? ` — ${user.name}` : ''}`);
    setChecking(false);
    if (ok) onUnlock();
    else setFailed(true);
  }

  useEffect(() => {
    getBiometricLabel().then(setLabel);
    tryUnlock();
    // Only run once on mount — re-triggering on every render would re-open the
    // native prompt as soon as it's dismissed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: C.primaryLight }]}>
          <FontAwesome5 name="fingerprint" size={44} color={C.brinjal1} />
        </View>
        <Text style={[styles.title, { color: C.text }]}>Unlock kolab</Text>
        <Text style={[styles.subtitle, { color: C.textSecondary }]}>
          {checking ? `Waiting for ${label}…` : failed ? `${label} didn't work — try again.` : `Use ${label} to continue`}
        </Text>

        {checking ? (
          <ActivityIndicator color={C.brinjal1} style={styles.spinner} />
        ) : (
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
            style={[styles.primaryBtn, { backgroundColor: C.brinjal1, shadowColor: C.brinjal1 }]}
            onPress={tryUnlock}>
            <Text style={styles.primaryBtnText}>Unlock with {label}</Text>
          </Pressable>
        )}

        <Pressable style={styles.linkBtn} onPress={() => { void logout(); }}>
          <Text style={[styles.linkText, { color: C.brinjal1 }]}>Use password instead</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content:   { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  iconWrap:  { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title:     { fontSize: 22, fontFamily: F.bold, marginBottom: 8 },
  subtitle:  { fontSize: 14, fontFamily: F.regular, textAlign: 'center' },
  spinner:   { marginTop: 28 },
  primaryBtn: {
    marginTop: 28, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 14,
    shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontFamily: F.semibold },
  linkBtn:  { marginTop: 22, padding: 8 },
  linkText: { fontSize: 14, fontFamily: F.medium },
});
