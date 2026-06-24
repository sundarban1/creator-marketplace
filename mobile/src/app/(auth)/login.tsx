import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRef, useState, useEffect } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import type { Lang } from '@/i18n';
import { F } from '@/utilities/constants';

const LANG_OPTIONS: { lang: Lang; flag: string }[] = [
  { lang: 'en', flag: '🇬🇧' },
  { lang: 'ne', flag: '🇳🇵' },
];

const PRIMARY = '#5B21B6';

// ── Input field ───────────────────────────────────────────────────────────────

function Field({
  icon, value, onChangeText, placeholder, label,
  secureTextEntry = false, keyboardType = 'default',
  rightSlot,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  rightSlot?: React.ReactNode;
}) {
  const C = useAppColors();
  const [focused, setFocused] = useState(false);
  const [hidden,  setHidden]  = useState(secureTextEntry);
  const anim = useRef(new Animated.Value(0)).current;
  const border = anim.interpolate({ inputRange: [0, 1], outputRange: ['#E5E7EB', PRIMARY] });

  return (
    <View style={s.fieldWrap}>
      <View style={s.fieldLabelRow}>
        <Text style={[s.fieldLabel, { color: C.text }]}>{label}</Text>
        {rightSlot}
      </View>
      <Animated.View style={[s.field, { borderColor: border, backgroundColor: C.surface }]}>
        <Ionicons name={icon} size={17} color={focused ? PRIMARY : '#9CA3AF'} style={s.fieldIcon} />
        <TextInput
          style={[s.fieldInput, { color: C.text }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          secureTextEntry={hidden}
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={() => { setFocused(true);  Animated.timing(anim, { toValue: 1, duration: 180, useNativeDriver: false }).start(); }}
          onBlur={()  => { setFocused(false); Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: false }).start(); }}
        />
        {secureTextEntry && (
          <Pressable onPress={() => setHidden(h => !h)} hitSlop={8} style={s.eyeBtn}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={17} color="#9CA3AF" />
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const { user, login }              = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const C                            = useAppColors();
  const params                       = useLocalSearchParams();
  const verified = typeof params.verified === 'string' ? params.verified : undefined;

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => {
    if (user) router.replace((user.role === 'CREATOR' ? '/(creator)/' : '/(business)/') as never);
  }, [user]);

  async function handleLogin() {
    if (!email || !password) { setError(t('auth.login.requiredError')); return; }
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('auth.login.requiredError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[s.root, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* App header */}
          <View style={s.appHeader}>
            <View style={s.appHeaderLeft}>
              <LinearGradient colors={['#7C3AED', PRIMARY]} style={s.logoBox} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Ionicons name="people" size={18} color="#fff" />
              </LinearGradient>
              <View>
                <Text style={[s.appName, { color: C.text }]}>CreatorMarket</Text>
                <Text style={[s.appTagline, { color: '#9CA3AF' }]}>Where creators and brands grow together</Text>
              </View>
            </View>
            {/* Lang */}
            <View style={s.langRow}>
              {LANG_OPTIONS.map(({ lang, flag }) => (
                <Pressable
                  key={lang}
                  style={[s.langBtn, { borderColor: '#E5E7EB' }, language === lang && { borderColor: PRIMARY, backgroundColor: `${PRIMARY}10` }]}
                  onPress={() => setLanguage(lang)}>
                  <Text style={s.langFlag}>{flag}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Heading */}
          <View style={s.headingWrap}>
            <Text style={[s.heading, { color: C.text }]}>Welcome back 👋</Text>
            <Text style={[s.headingSub, { color: '#6B7280' }]}>
              Log in to your account and continue collaborating and growing.
            </Text>
          </View>

          {/* Banners */}
          {verified === '1' && (
            <View style={[s.banner, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
              <Ionicons name="checkmark-circle" size={15} color="#15803D" />
              <Text style={[s.bannerText, { color: '#15803D' }]}>Account verified! You can sign in now.</Text>
            </View>
          )}
          {!!error && (
            <View style={[s.banner, { backgroundColor: '#FFF1F2', borderColor: '#FECDD3' }]}>
              <Ionicons name="alert-circle" size={15} color="#EF4444" />
              <Text style={[s.bannerText, { color: '#EF4444' }]}>{error}</Text>
            </View>
          )}

          {/* Form */}
          <View style={s.form}>
            <Field
              icon="mail-outline"
              label="Email address"
              value={email}
              onChangeText={setEmail}
              placeholder="you@email.com"
              keyboardType="email-address"
            />
            <Field
              icon="lock-closed-outline"
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
              rightSlot={
                <Pressable onPress={() => router.push('/forgot-password')}>
                  <Text style={[s.forgotText, { color: PRIMARY }]}>Forgot password?</Text>
                </Pressable>
              }
            />
          </View>

          {/* Sign in */}
          <Pressable
            onPress={handleLogin}
            disabled={loading}
            style={({ pressed }) => [s.primaryBtn, { backgroundColor: PRIMARY, opacity: pressed ? 0.88 : 1 }]}>
            {loading
              ? <Ionicons name="sync" size={18} color="#fff" />
              : <Text style={s.primaryBtnText}>Log in</Text>}
          </Pressable>

          {/* Divider */}
          <View style={s.divider}>
            <View style={[s.dividerLine, { backgroundColor: '#E5E7EB' }]} />
            <Text style={s.dividerText}>or continue with</Text>
            <View style={[s.dividerLine, { backgroundColor: '#E5E7EB' }]} />
          </View>

          {/* Social buttons */}
          <Pressable
            style={[s.socialBtn, { borderColor: '#E5E7EB', backgroundColor: C.surface }]}
            onPress={() => setError('Google sign-in is not available yet.')}>
            <View style={s.googleBadge}><Text style={s.googleG}>G</Text></View>
            <Text style={[s.socialBtnText, { color: C.text }]}>Continue with Google</Text>
          </Pressable>

          {/* Sign up link */}
          <View style={s.switchRow}>
            <Text style={[s.switchText, { color: '#6B7280' }]}>Don't have an account?</Text>
            <Pressable onPress={() => router.push('/signup')}>
              <Text style={[s.switchLink, { color: PRIMARY }]}>Sign up</Text>
            </Pressable>
          </View>

          {/* Security footer */}
          <View style={s.secureRow}>
            <Ionicons name="shield-checkmark-outline" size={13} color="#9CA3AF" />
            <Text style={s.secureText}>Secure login  •  Your data is safe with us</Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1 },
  flex:   { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 32 },

  appHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 },
  appHeaderLeft:{ flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBox:      { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  appName:      { fontSize: 15, fontWeight: '700', fontFamily: F.bold },
  appTagline:   { fontSize: 10, fontFamily: F.regular, marginTop: 1 },
  langRow:      { flexDirection: 'row', gap: 6 },
  langBtn:      { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  langFlag:     { fontSize: 14 },

  headingWrap: { marginBottom: 24, gap: 6 },
  heading:     { fontSize: 26, fontWeight: '800', fontFamily: F.extrabold },
  headingSub:  { fontSize: 14, fontFamily: F.regular, lineHeight: 20 },

  banner:     { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 16 },
  bannerText: { fontSize: 13, flex: 1, fontFamily: F.medium },

  form:     { gap: 16, marginBottom: 20 },
  fieldWrap:    { gap: 6 },
  fieldLabelRow:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldLabel:   { fontSize: 13, fontWeight: '600', fontFamily: F.semibold },
  forgotText:   { fontSize: 13, fontFamily: F.semibold },
  field:        { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, height: 50, gap: 10 },
  fieldIcon:    { flexShrink: 0 },
  fieldInput:   { flex: 1, fontSize: 15, fontFamily: F.regular },
  eyeBtn:       { padding: 2 },

  primaryBtn:     { height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#fff', fontFamily: F.bold },

  divider:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { fontSize: 12, color: '#9CA3AF', fontFamily: F.regular },

  socialBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 50, borderRadius: 12, borderWidth: 1.5, marginBottom: 8 },
  googleBadge:   { width: 22, height: 22, borderRadius: 11, backgroundColor: '#4285F4', justifyContent: 'center', alignItems: 'center' },
  googleG:       { color: '#fff', fontSize: 12, fontWeight: '900', fontFamily: F.extrabold },
  socialBtnText: { fontSize: 15, fontFamily: F.semibold },

  switchRow:  { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, marginTop: 20, marginBottom: 16 },
  switchText: { fontSize: 14, fontFamily: F.regular },
  switchLink: { fontSize: 14, fontFamily: F.bold, fontWeight: '700' },

  secureRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  secureText: { fontSize: 11, color: '#9CA3AF', fontFamily: F.regular },
});
